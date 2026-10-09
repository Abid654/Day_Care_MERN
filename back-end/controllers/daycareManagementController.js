const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs/promises");
const path = require("path");
const { randomBytes, randomUUID } = require("crypto");
const { publishCenterNotification } = require("../services/realtime");

const MODULES = {
  children: { model: "Child", search: ["name", "allergies", "nationality"], softDelete: true, populate: [{ path: "parentContact", select: "name" }, { path: "assignedCaregiver", select: "fullName" }, { path: "classGroup", select: "name" }], fields: ["name", "profilePhoto", "dateOfBirth", "gender", "bloodGroup", "nationality", "medicalInformation", "allergies", "emergencyMedicalInformation", "address", "enrollmentDate", "parentContact", "emergencyContactName", "emergencyContactNumber", "assignedCaregiver", "classGroup", "specialRequirements", "specialNotes", "status"] },
  parents: { model: "DaycareParent", search: ["name", "email", "phone"], softDelete: true, fields: ["name", "email", "phone", "profilePhoto", "address", "emergencyContactName", "emergencyContactPhone", "status"] },
  staff: { model: "Staff", search: ["fullName", "email", "phone", "jobTitle"], softDelete: true, populate: [{ path: "assignedClass", select: "name" }], fields: ["fullName", "email", "phone", "profilePhoto", "address", "dateOfBirth", "gender", "qualification", "experienceYears", "joiningDate", "jobTitle", "role", "assignedClass", "emergencyContactName", "emergencyContactPhone", "documents", "status"] },
  classes: { model: "ClassGroup", search: ["name", "description"], softDelete: true, populate: [{ path: "assignedCaregiver", select: "fullName" }, { path: "children", select: "name" }], fields: ["name", "description", "minAgeMonths", "maxAgeMonths", "capacity", "assignedCaregiver", "status"] },
  attendance: { model: "Attendance", search: ["notes"], populate: [{ path: "child", select: "name" }], fields: ["child", "date", "status", "checkIn", "checkOut", "notes"] },
  staffAttendance: { model: "StaffAttendance", search: ["notes"], populate: [{ path: "staff", select: "fullName" }], fields: ["staff", "date", "status", "checkIn", "checkOut", "notes"] },
  dailyActivities: { model: "DailyActivity", search: ["notes", "activities", "healthObservations"], populate: [{ path: "child", select: "name" }], fields: ["child", "date", "meals", "snacks", "nap", "toileting", "activities", "mood", "behavior", "healthObservations", "medication", "notes", "sharedWithParent"] },
  fees: { model: "FeeInvoice", search: ["invoiceNumber", "description", "transactionReference"], populate: [{ path: "child", select: "name" }, { path: "parent", select: "name" }, { path: "payments.receivedBy", select: "name" }], fields: ["invoiceNumber", "child", "parent", "description", "amount", "dueDate", "status", "notes"] },
  leave: { model: "LeaveRequest", search: ["leaveType", "reason", "adminRemarks"], populate: [{ path: "staff", select: "fullName" }], fields: ["staff", "leaveType", "startDate", "endDate", "reason", "status", "adminRemarks"] },
  complaints: { model: "Complaint", search: ["complaintNumber", "subject", "description", "internalNotes"], populate: [{ path: "parent", select: "name" }, { path: "child", select: "name" }, { path: "assignedStaff", select: "fullName" }], fields: ["complaintNumber", "parent", "child", "subject", "description", "priority", "assignedStaff", "status", "response", "internalNotes", "history"] },
  requests: { model: "ParentRequest", search: ["subject", "description", "adminRemarks"], populate: [{ path: "parent", select: "name" }, { path: "child", select: "name" }], fields: ["parent", "child", "requestType", "subject", "description", "status", "adminRemarks"] },
  pickupPersons: { model: "PickupAuthorization", search: ["name", "relationship", "phone", "identificationNumber"], populate: [{ path: "child", select: "name" }], fields: ["child", "name", "relationship", "phone", "identificationNumber", "photo", "authorized", "notes"] },
  pickupLogs: { model: "PickupLog", search: ["pickupName", "notes"], populate: [{ path: "child", select: "name" }, { path: "pickupPerson", select: "name relationship" }, { path: "verifiedBy", select: "name" }], fields: ["child", "pickupPerson", "pickupName", "eventType", "occurredAt", "verified", "notes"] },
  notifications: { model: "CenterNotification", search: ["title", "message"], populate: [{ path: "parent", select: "name" }, { path: "child", select: "name" }, { path: "staffMember", select: "fullName" }, { path: "classGroup", select: "name" }], fields: ["title", "message", "type", "audience", "parent", "child", "staffMember", "classGroup", "status"] },
  announcements: { model: "Announcement", search: ["title", "description"], populate: [{ path: "classGroup", select: "name" }], fields: ["title", "description", "attachment", "startDate", "endDate", "audience", "classGroup", "status"] },
  events: { model: "DaycareEvent", search: ["name", "description", "location"], populate: [{ path: "classGroup", select: "name" }], fields: ["name", "description", "date", "startTime", "endTime", "location", "audience", "classGroup", "reminderAt", "status"] },
  documents: { model: "DaycareDocument", search: ["title", "category"], populate: [{ path: "child", select: "name" }, { path: "parent", select: "name" }, { path: "staff", select: "fullName" }], fields: ["title", "category", "child", "parent", "staff"] },
  activity: { model: "AuditLog", search: ["action", "module"], fields: [], readOnly: true },
};

const PERMISSION_MODULES = ["dashboard", ...Object.keys(MODULES), "reports", "settings"];
const sanitizePermissions = (input = {}) => Object.fromEntries(PERMISSION_MODULES.filter((name) => Array.isArray(input[name])).map((name) => [name, input[name].filter((action) => ["read", "create", "update", "delete"].includes(action))]));

async function resolveParentIdentity(req, email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw Object.assign(new Error("A valid parent email is required to link this family to its parent account"), { statusCode: 400 });
  const identity = await req.mainModels.User.findOne({ email: cleanEmail }).select("_id role").lean();
  if (identity && identity.role !== "parent") throw Object.assign(new Error("This email is already used by another account type"), { statusCode: 409 });
  if (await req.mainModels.TenantMembership.exists({ email: cleanEmail }) || await req.mainModels.Tenant.exists({ ownerEmail: cleanEmail })) throw Object.assign(new Error("This email is already used by another account"), { statusCode: 409 });
  return { email: cleanEmail, parentUser: identity?._id || null };
}

async function syncParentTenantLink(req, parentRecord) {
  const identity = await resolveParentIdentity(req, parentRecord.email);
  await req.mainModels.ParentTenantLink.findOneAndUpdate(
    { tenant: req.tenant._id, email: identity.email },
    { $set: { email: identity.email, parentUser: identity.parentUser, daycareParent: parentRecord._id, isActive: parentRecord.status !== "inactive" }, $setOnInsert: { tenant: req.tenant._id } },
    { upsert: true, new: true, runValidators: true },
  );
  await req.models.DaycareParent.updateOne({ _id: parentRecord._id }, { $set: { parentUser: identity.parentUser } });
}

async function validateNotificationTarget(req, notification) {
  if (notification.audience === "parent" && (!notification.parent || !(await req.models.DaycareParent.exists({ _id: notification.parent, status: "active" })))) return "Choose an active parent for this notification";
  if (notification.audience === "class" && (!notification.classGroup || !(await req.models.ClassGroup.exists({ _id: notification.classGroup, status: "active" })))) return "Choose an active class for this notification";
  if (notification.audience === "child" && (!notification.child || !(await req.models.Child.exists({ _id: notification.child, status: { $ne: "inactive" }, parentContact: { $ne: null } })))) return "Choose an active child linked to a parent";
  if (notification.audience === "staff-member" && (!notification.staffMember || !(await req.models.Staff.exists({ _id: notification.staffMember, status: "active", userAccount: { $ne: null } })))) return "Choose an active staff member account";
  return null;
}

async function listUsers(req, res) {
  const memberships = await req.mainModels.TenantMembership.find({ tenant: req.tenant._id }).select("user email role permissions isActive lastLoginAt createdAt").sort({ createdAt: -1 }).lean();
  const accounts = await req.models.User.find({ _id: { $in: memberships.map((item) => item.user) } }).select("name phone").lean();
  const accountById = new Map(accounts.map((item) => [String(item._id), item]));
  return res.json({ success: true, users: memberships.map((item) => ({ ...item, name: accountById.get(String(item.user))?.name || item.email, phone: accountById.get(String(item.user))?.phone || "" })) });
}

async function createUser(req, res) {
  const { password, role, staffId } = req.body || {};
  if (!validId(staffId) || typeof password !== "string" || password.length < 8 || !["manager", "caregiver", "nurse", "support"].includes(role)) {
    return res.status(400).json({ success: false, message: "Select an active staff member and set a password of at least 8 characters" });
  }
  try {
    const [activeUserCount, tenant] = await Promise.all([
      req.mainModels.TenantMembership.countDocuments({ tenant: req.tenant._id, isActive: true }),
      req.mainModels.Tenant.findById(req.tenant._id).select("userLimit").lean(),
    ]);
    const userLimit = Math.max(10, Number(tenant?.userLimit) || 10);
    if (activeUserCount >= userLimit) return res.status(403).json({ success: false, message: `This daycare has reached its limit of ${userLimit} staff logins. Ask the Super Admin to increase the allowance.` });
    const staff = await req.models.Staff.findOne({ _id: staffId, role, status: "active", userAccount: { $in: [null] } });
    if (!staff) return res.status(409).json({ success: false, message: "This staff member is unavailable or already has a login" });
    const cleanEmail = typeof staff.email === "string" ? staff.email.trim().toLowerCase() : "";
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ success: false, message: "Add a valid email to this staff profile before creating login access" });
    if (!staff.phone?.trim()) return res.status(400).json({ success: false, message: "Add a phone number to this staff profile before creating login access" });
    if (await req.mainModels.User.exists({ email: cleanEmail }) || await req.mainModels.TenantMembership.exists({ email: cleanEmail }) || await req.mainModels.Tenant.exists({ ownerEmail: cleanEmail })) return res.status(409).json({ success: false, message: "This email is already in use" });
    const userId = new mongoose.Types.ObjectId();
    const user = await req.models.User.create({ _id: userId, name: staff.fullName, email: cleanEmail, phone: staff.phone, password: await bcrypt.hash(password, 10), role });
    const permissions = sanitizePermissions(req.body.permissions);
    let membership;
    try {
      membership = await req.mainModels.TenantMembership.create({ tenant: req.tenant._id, user: user._id, email: cleanEmail, role, permissions });
      const linkedStaff = await req.models.Staff.updateOne({ _id: staff._id, status: "active", userAccount: { $in: [null] } }, { $set: { userAccount: user._id, email: cleanEmail } });
      if (!linkedStaff.modifiedCount) throw Object.assign(new Error("This staff member already has a login"), { statusCode: 409 });
    } catch (error) {
      await Promise.all([req.models.User.deleteOne({ _id: user._id }), membership ? req.mainModels.TenantMembership.deleteOne({ _id: membership._id }) : Promise.resolve()]);
      throw error;
    }
    await writeAudit(req, "created", "users", user._id, { role, email: cleanEmail });
    return res.status(201).json({ success: true, user: { id: user._id, staffId: staff._id, name: user.name, email: user.email, role, permissions, isActive: true } });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    if (error.code === 11000) return res.status(409).json({ success: false, message: "This email is already in use" });
    console.error("Daycare user create failed:", error.message);
    return res.status(503).json({ success: false, message: "User account could not be created" });
  }
}

async function updateUser(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ success: false, message: "Invalid user id" });
  const membership = await req.mainModels.TenantMembership.findOne({ tenant: req.tenant._id, user: req.params.userId });
  if (!membership) return res.status(404).json({ success: false, message: "User not found" });
  const wasActive = membership.isActive;
  const updates = {};
  if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;
  if (req.body?.permissions && typeof req.body.permissions === "object") updates.permissions = sanitizePermissions(req.body.permissions);
  if (typeof req.body?.password === "string" && req.body.password.length >= 8) {
    await req.models.User.updateOne({ _id: membership.user }, { $set: { password: await bcrypt.hash(req.body.password, 10) }, $inc: { tokenVersion: 1 } });
  } else if (req.body?.password !== undefined) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
  Object.assign(membership, updates);
  await membership.save();
  const userUpdate = { $set: { isActive: membership.isActive } };
  if (wasActive !== membership.isActive) userUpdate.$inc = { tokenVersion: 1 };
  await req.models.User.updateOne({ _id: membership.user }, userUpdate);
  await writeAudit(req, "updated", "users", membership.user, { changedFields: Object.keys(updates) });
  return res.json({ success: true, user: membership.toObject() });
}

async function deleteUser(req, res) {
  if (!validId(req.params.userId)) return res.status(400).json({ success: false, message: "Invalid user id" });
  try {
    const membership = await req.mainModels.TenantMembership.findOne({ tenant: req.tenant._id, user: req.params.userId });
    if (!membership) return res.status(404).json({ success: false, message: "Staff login not found" });
    const otherMembership = await req.mainModels.TenantMembership.exists({ user: membership.user, _id: { $ne: membership._id } });
    if (otherMembership) return res.status(409).json({ success: false, message: "This login is linked to another daycare and cannot be deleted here" });
    await writeAudit(req, "deleted", "users", membership.user, { role: membership.role, email: membership.email });
    await req.models.User.deleteOne({ _id: membership.user, role: membership.role });
    await req.models.Staff.updateMany({ userAccount: membership.user }, { $unset: { userAccount: 1 } });
    await req.mainModels.TenantMembership.deleteOne({ _id: membership._id, tenant: req.tenant._id });
    return res.json({ success: true, message: "Staff login deleted; staff profile kept" });
  } catch (error) {
    console.error("Daycare staff login delete failed:", error.message);
    return res.status(503).json({ success: false, message: "Staff login could not be deleted" });
  }
}
async function resetParentPassword(req, res) {
  if (!validId(req.params.parentId)) return res.status(400).json({ success: false, message: "Invalid parent id" });
  try {
    const parent = await req.models.DaycareParent.findOne({ _id: req.params.parentId, status: "active" }).select("parentUser email").lean();
    if (!parent) return res.status(404).json({ success: false, message: "Active parent not found" });
    const link = await req.mainModels.ParentTenantLink.findOne({ tenant: req.tenant._id, daycareParent: parent._id, email: parent.email, isActive: true }).select("parentUser").lean();
    if (!link?.parentUser || (parent.parentUser && String(link.parentUser) !== String(parent.parentUser))) return res.status(409).json({ success: false, message: "This parent does not have an active sign-in account" });
    const temporaryPassword = randomBytes(24).toString("base64url");
    const updated = await req.mainModels.User.updateOne({ _id: link.parentUser, role: "parent", isActive: true }, { $set: { password: await bcrypt.hash(temporaryPassword, 12) }, $inc: { tokenVersion: 1 } });
    if (!updated.matchedCount) return res.status(404).json({ success: false, message: "Parent sign-in account not found" });
    await writeAudit(req, "parent-password-reset", "parents", parent._id, { email: parent.email });
    return res.json({ success: true, temporaryPassword, message: "Password reset. Share the temporary password with the parent using a private channel." });
  } catch (error) {
    console.error("Daycare parent password reset failed:", error.message);
    return res.status(503).json({ success: false, message: "Parent password could not be reset" });
  }
}

async function logLogout(req, res) {
  await writeAudit(req, "logout", "auth", req.user.userId);
  return res.json({ success: true });
}

const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pickFields = (body, fields) => Object.fromEntries(fields.filter((field) => Object.prototype.hasOwnProperty.call(body, field)).map((field) => [field, body[field]]));
const validId = (value) => mongoose.Types.ObjectId.isValid(value);
const normalizeAttendanceDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};
const validAttendanceTimes = (checkIn, checkOut) => !checkIn || !checkOut || new Date(checkOut) > new Date(checkIn);

async function caregiverScope(req, moduleName) {
  if (req.user.role !== "caregiver") return null;
  const staff = await req.models.Staff.findOne({ userAccount: req.user.userId, status: "active" }).select("_id assignedClass").lean();
  if (!staff) return { _id: { $in: [] } };
  const classIds = staff.assignedClass ? [staff.assignedClass] : [];
  const children = await req.models.Child.find({ status: { $ne: "inactive" }, $or: [{ assignedCaregiver: staff._id }, ...(classIds.length ? [{ classGroup: { $in: classIds } }] : [])] }).distinct("_id");
  if (moduleName === "children") return { _id: { $in: children } };
  if (["attendance", "dailyActivities", "pickupPersons", "pickupLogs"].includes(moduleName)) return { child: { $in: children } };
  if (moduleName === "documents") return { $or: [{ child: { $in: children } }, { staff: staff._id }] };
  if (moduleName === "announcements") return { $or: [{ audience: { $in: ["all", "staff", "everyone"] } }, ...(classIds.length ? [{ classGroup: { $in: classIds } }] : [])] };
  if (moduleName === "events") return { $or: [{ audience: { $in: ["everyone", "staff"] } }, ...(classIds.length ? [{ classGroup: { $in: classIds } }] : [])] };
  return { _id: { $in: [] } };
}

async function findScopedRecord(req, config) {
  const filter = { _id: req.params.recordId };
  const scope = await caregiverScope(req, req.params.module);
  if (scope) Object.assign(filter, scope);
  return config.Model.findOne(filter);
}

async function writeAudit(req, action, module, record, metadata = {}) {
  try {
    await req.models.AuditLog.create({ user: req.user.userId, action, module, record, metadata, ipAddress: req.ip });
  } catch (error) {
    console.error("Daycare audit write failed:", error.message);
  }
}

function moduleConfig(req, res) {
  const config = MODULES[req.params.module];
  if (!config) {
    res.status(404).json({ success: false, message: "Management module not found" });
    return null;
  }
  const Model = req.models[config.model];
  if (!Model) {
    res.status(503).json({ success: false, message: "Management module is not available" });
    return null;
  }
  return { ...config, Model };
}

async function listRecords(req, res) {
  const config = moduleConfig(req, res);
  if (!config) return;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const isActivityLog = req.params.module === "activity";
  const scope = isActivityLog ? null : await caregiverScope(req, req.params.module);
  const filter = isActivityLog ? { user: req.user.userId } : scope ? { $and: [scope] } : {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  if (req.query.category && config.fields.includes("category")) filter.category = String(req.query.category).slice(0, 40);
  if (req.query.from || req.query.to) {
    const dateField = config.model === "Attendance" || config.model === "StaffAttendance" || config.model === "DailyActivity" ? "date" : config.model === "FeeInvoice" ? "dueDate" : config.model === "DaycareEvent" ? "date" : "createdAt";
    filter[dateField] = {};
    if (req.query.from && !Number.isNaN(Date.parse(req.query.from))) filter[dateField].$gte = new Date(req.query.from);
    if (req.query.to && !Number.isNaN(Date.parse(req.query.to))) {
      const endDate = new Date(req.query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) {
        endDate.setDate(endDate.getDate() + 1);
        filter[dateField].$lt = endDate;
      } else filter[dateField].$lte = endDate;
    }
  }
  const search = String(req.query.search || "").trim().slice(0, 100);
  if (search && config.search.length) filter.$or = config.search.map((field) => ({ [field]: { $regex: escapedRegex(search), $options: "i" } }));
  for (const field of ["child", "parent", "parentContact", "assignedCaregiver", "staff", "assignedStaff", "pickupPerson", "classGroup"]) {
    const value = req.query[field];
    if (!value || !config.fields.includes(field)) continue;
    if (!validId(value)) return res.status(400).json({ success: false, message: `Invalid ${field} filter` });
    filter[field] = value;
  }
  if (req.query.classGroup && ["attendance", "dailyActivities", "pickupPersons", "pickupLogs"].includes(req.params.module)) {
    if (!validId(req.query.classGroup)) return res.status(400).json({ success: false, message: "Invalid class filter" });
    const childIds = await req.models.Child.find({ classGroup: req.query.classGroup }).distinct("_id");
    filter.child = filter.child ? { $in: childIds.filter((id) => String(id) === String(filter.child)) } : { $in: childIds };
  }
  if (req.query.classGroup && req.params.module === "staffAttendance") {
    if (!validId(req.query.classGroup)) return res.status(400).json({ success: false, message: "Invalid class filter" });
    const staffIds = await req.models.Staff.find({ assignedClass: req.query.classGroup }).distinct("_id");
    filter.staff = { $in: staffIds };
  }
  try {
    const allowedSorts = new Set(["createdAt", "updatedAt", "name", "fullName", "date", "startDate", "dueDate", "status"]);
    const sortBy = allowedSorts.has(req.query.sortBy) || config.fields.includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const sortDirection = req.query.sortOrder === "asc" ? 1 : -1;
    const [records, total] = await Promise.all([
      config.Model.find(filter).populate(config.populate || []).sort({ [sortBy]: sortDirection, _id: sortDirection }).skip((page - 1) * limit).limit(limit).lean(),
      config.Model.countDocuments(filter),
    ]);
    let resultRecords = records;
    if (req.params.module === "parents" && records.length) {
      const counts = await req.models.Child.aggregate([{ $match: { parentContact: { $in: records.map((record) => record._id) } } }, { $group: { _id: "$parentContact", count: { $sum: 1 } } }]);
      const countByParent = new Map(counts.map((item) => [String(item._id), item.count]));
      resultRecords = records.map((record) => ({ ...record, childrenCount: countByParent.get(String(record._id)) || 0 }));
    }
    return res.json({ success: true, records: resultRecords, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error(`Daycare ${req.params.module} list failed:`, error.message);
    return res.status(503).json({ success: false, message: "Records could not be loaded" });
  }
}

async function createRecord(req, res) {
  const config = moduleConfig(req, res);
  if (!config) return;
  if (config.readOnly) return res.status(405).json({ success: false, message: "This module is read-only" });
  if (config.model === "DaycareDocument") return res.status(400).json({ success: false, message: "Upload a file to create a document record" });
  let createdParentId = null;
  try {
    const fields = pickFields(req.body || {}, config.fields);
    if (["Attendance", "StaffAttendance"].includes(config.model)) {
      fields.date = normalizeAttendanceDate(fields.date);
      if (!fields.date) return res.status(400).json({ success: false, message: "Enter a valid attendance date" });
      if (!validAttendanceTimes(fields.checkIn, fields.checkOut)) return res.status(400).json({ success: false, message: "Check-out must be later than check-in" });
      const relationModel = config.model === "Attendance" ? req.models.Child : req.models.Staff;
      const relationField = config.model === "Attendance" ? "child" : "staff";
      if (!(await relationModel.exists({ _id: fields[relationField], status: "active" }))) return res.status(400).json({ success: false, message: "Select an active child or staff member" });
      if (await config.Model.exists({ [relationField]: fields[relationField], date: fields.date })) return res.status(409).json({ success: false, message: "Attendance is already recorded for this date" });
    }
    if (config.model === "DaycareParent") {
      const identity = await resolveParentIdentity(req, fields.email);
      if (await config.Model.exists({ email: identity.email })) return res.status(409).json({ success: false, message: "A parent with this email already exists" });
      fields.email = identity.email;
      fields.parentUser = identity.parentUser;
    }
    if (config.model === "PickupLog") {
      const authorized = fields.pickupPerson && await req.models.PickupAuthorization.findOne({ _id: fields.pickupPerson, child: fields.child, authorized: true }).select("name").lean();
      if (!authorized) return res.status(403).json({ success: false, message: "Only an authorized pickup person may be recorded for this child" });
      fields.pickupName = authorized.name;
      fields.verifiedBy = fields.verified ? req.user.userId : undefined;
    }
    if (config.model === "FeeInvoice") {
      const amount = Number(fields.amount || 0);
      const paidAmount = Number(fields.paidAmount || 0);
      if (paidAmount > amount) return res.status(400).json({ success: false, message: "Paid amount cannot exceed the invoice amount" });
      if (paidAmount >= amount && amount > 0) { fields.status = "paid"; fields.paidAt = fields.paidAt || new Date(); }
      else if (paidAmount > 0) fields.status = "partially-paid";
      else fields.status = new Date(fields.dueDate) < new Date() ? "overdue" : "pending";
    }
    if (req.user.role === "caregiver" && ["attendance", "dailyActivities", "pickupPersons", "pickupLogs"].includes(req.params.module)) {
      const children = await caregiverScope(req, "children");
      if (!fields.child || !(await req.models.Child.exists({ _id: fields.child, $and: [children] }))) return res.status(403).json({ success: false, message: "You can only manage assigned children" });
    }
    if (["Attendance", "StaffAttendance"].includes(config.model)) fields.markedBy = req.user.userId;
    if (config.model === "Attendance") fields.daycare = req.user.userId;
    if (config.model === "DaycareParent" || config.model === "Staff" || config.model === "ClassGroup" || config.model === "FeeInvoice" || config.model === "LeaveRequest" || config.model === "Complaint" || config.model === "ParentRequest" || config.model === "DailyActivity" || config.model === "PickupAuthorization" || config.model === "PickupLog" || config.model === "Announcement" || config.model === "DaycareEvent" || config.model === "CenterNotification") fields.createdBy = req.user.userId;
    if (config.model === "DaycareDocument") fields.uploadedBy = req.user.userId;
    if (config.model === "ClassGroup" && (fields.children || []).length > Number(fields.capacity)) return res.status(400).json({ success: false, message: "Class capacity cannot be less than assigned children" });
    if (config.model === "FeeInvoice" && !fields.invoiceNumber) fields.invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (config.model === "Complaint" && !fields.complaintNumber) fields.complaintNumber = `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (config.model === "Child" && fields.classGroup && fields.status !== "inactive") {
      const classGroup = await req.models.ClassGroup.findOne({ _id: fields.classGroup, status: "active" }).select("capacity").lean();
      if (!classGroup) return res.status(400).json({ success: false, message: "Select an active class" });
      const enrolled = await req.models.Child.countDocuments({ classGroup: fields.classGroup, status: { $ne: "inactive" } });
      if (enrolled >= classGroup.capacity) return res.status(400).json({ success: false, message: "This class has reached its capacity" });
    }
    if (config.model === "CenterNotification") {
      if ((fields.status || "sent") === "sent") {
        const targetError = await validateNotificationTarget(req, fields);
        if (targetError) return res.status(400).json({ success: false, message: targetError });
        fields.sentAt = new Date();
      }
    }
    const record = await config.Model.create(fields);
    if (config.model === "CenterNotification") await publishCenterNotification(req, record);
    if (config.model === "DaycareParent") {
      createdParentId = record._id;
      await syncParentTenantLink(req, record);
    }
    if (config.model === "Child" && fields.classGroup && fields.status !== "inactive") {
      const reservation = await req.models.ClassGroup.updateOne({ _id: fields.classGroup, status: "active", $expr: { $lt: [{ $size: { $ifNull: ["$children", []] } }, "$capacity"] } }, { $addToSet: { children: record._id } });
      if (!reservation.matchedCount) {
        await req.models.Child.deleteOne({ _id: record._id });
        return res.status(400).json({ success: false, message: "This class has reached its capacity" });
      }
    }
    await writeAudit(req, "created", req.params.module, record._id, { title: fields.name || fields.fullName || fields.title || fields.subject || fields.invoiceNumber || "" });
    return res.status(201).json({ success: true, record, message: "Record created successfully" });
  } catch (error) {
    if (createdParentId) {
      await req.mainModels.ParentTenantLink.deleteOne({ tenant: req.tenant._id, daycareParent: createdParentId }).catch(() => {});
      await req.models.DaycareParent.deleteOne({ _id: createdParentId }).catch(() => {});
    }
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    if (error.name === "ValidationError" || error.code === 11000 || error.name === "CastError") return res.status(400).json({ success: false, message: error.code === 11000 ? "A record with this reference already exists" : error.message });
    console.error(`Daycare ${req.params.module} create failed:`, error.message);
    return res.status(503).json({ success: false, message: "Record could not be created" });
  }
}

async function updateRecord(req, res) {
  const config = moduleConfig(req, res);
  if (!config) return;
  if (config.readOnly) return res.status(405).json({ success: false, message: "This module is read-only" });
  if (!validId(req.params.recordId)) return res.status(400).json({ success: false, message: "Invalid record id" });
  let reservedClassId = null;
  try {
    const changes = pickFields(req.body || {}, config.fields);
    const previousNotification = config.model === "CenterNotification"
      ? await config.Model.findById(req.params.recordId).select("status audience parent child staffMember classGroup").lean()
      : null;
    if (["Attendance", "StaffAttendance"].includes(config.model)) {
      const relationField = config.model === "Attendance" ? "child" : "staff";
      const current = await config.Model.findById(req.params.recordId).select(`${relationField} date checkIn checkOut`).lean();
      if (!current) return res.status(404).json({ success: false, message: "Record not found" });
      if (changes.date !== undefined) {
        changes.date = normalizeAttendanceDate(changes.date);
        if (!changes.date) return res.status(400).json({ success: false, message: "Enter a valid attendance date" });
      }
      const nextDate = changes.date || current.date;
      const nextRelation = changes[relationField] || current[relationField];
      const nextCheckIn = changes.checkIn === undefined ? current.checkIn : changes.checkIn;
      const nextCheckOut = changes.checkOut === undefined ? current.checkOut : changes.checkOut;
      if (!validAttendanceTimes(nextCheckIn, nextCheckOut)) return res.status(400).json({ success: false, message: "Check-out must be later than check-in" });
      if (changes[relationField] || changes.date) {
        const duplicate = await config.Model.exists({ _id: { $ne: req.params.recordId }, [relationField]: nextRelation, date: nextDate });
        if (duplicate) return res.status(409).json({ success: false, message: "Attendance is already recorded for this date" });
      }
    }
    const currentParent = config.model === "DaycareParent" ? await config.Model.findById(req.params.recordId).select("email status").lean() : null;
    if (config.model === "DaycareParent" && !currentParent) return res.status(404).json({ success: false, message: "Record not found" });
    if (config.model === "DaycareParent" && changes.email !== undefined) {
      const identity = await resolveParentIdentity(req, changes.email);
      if (await config.Model.exists({ email: identity.email, _id: { $ne: req.params.recordId } })) return res.status(409).json({ success: false, message: "A parent with this email already exists" });
      changes.email = identity.email;
      changes.parentUser = identity.parentUser;
    }
    if (config.model === "CenterNotification") {
      if (!previousNotification) return res.status(404).json({ success: false, message: "Notification not found" });
      if ((changes.status || previousNotification.status) === "sent") {
        const targetError = await validateNotificationTarget(req, { ...previousNotification, ...changes });
        if (targetError) return res.status(400).json({ success: false, message: targetError });
      }
    }
    if (config.model === "ClassGroup" && (Object.prototype.hasOwnProperty.call(changes, "capacity") || Object.prototype.hasOwnProperty.call(changes, "children"))) {
      const current = await config.Model.findById(req.params.recordId).select("capacity").lean();
      if (!current) return res.status(404).json({ success: false, message: "Record not found" });
      const enrollmentCount = await req.models.Child.countDocuments({ classGroup: req.params.recordId, status: { $ne: "inactive" } });
      const nextCapacity = changes.capacity ?? current.capacity;
      if (enrollmentCount > Number(nextCapacity)) return res.status(400).json({ success: false, message: "Class capacity cannot be less than assigned children" });
    }
    if (config.model === "LeaveRequest" && ["approved", "rejected"].includes(changes.status)) changes.reviewedBy = req.user.userId;
    if (config.model === "ParentRequest" && ["approved", "rejected"].includes(changes.status)) changes.reviewedBy = req.user.userId;
    if (config.model === "Complaint" && changes.status) {
      const current = await findScopedRecord(req, config).select("status history");
      if (!current) return res.status(404).json({ success: false, message: "Record not found" });
      changes.history = [...current.history, { status: changes.status, note: changes.response || changes.internalNotes || "Status updated", changedBy: req.user.userId, changedAt: new Date() }];
    }
    if (config.model === "PickupLog" && (changes.child || changes.pickupPerson || changes.verified)) {
      const current = await findScopedRecord(req, config).select("child pickupPerson verified");
      if (!current) return res.status(404).json({ success: false, message: "Record not found" });
      const childId = changes.child || current.child;
      const personId = changes.pickupPerson || current.pickupPerson;
      const authorized = personId && await req.models.PickupAuthorization.findOne({ _id: personId, child: childId, authorized: true }).select("name").lean();
      if (!authorized) return res.status(403).json({ success: false, message: "Only an authorized pickup person may be recorded for this child" });
      changes.pickupName = authorized.name;
      if (changes.verified) changes.verifiedBy = req.user.userId;
    }
    if (config.model === "FeeInvoice" && (changes.amount !== undefined || changes.paidAmount !== undefined || changes.status !== undefined)) {
      const current = await config.Model.findById(req.params.recordId).select("amount paidAmount status paidAt dueDate").lean();
      if (!current) return res.status(404).json({ success: false, message: "Record not found" });
      const amount = Number(changes.amount ?? current.amount);
      const paidAmount = Number(changes.paidAmount ?? current.paidAmount);
      if (paidAmount > amount) return res.status(400).json({ success: false, message: "Paid amount cannot exceed the invoice amount" });
      if (paidAmount >= amount && amount > 0) { changes.status = "paid"; changes.paidAt = current.paidAt || new Date(); }
      else if (paidAmount > 0) changes.status = "partially-paid";
      else changes.status = new Date(changes.dueDate ?? current.dueDate) < new Date() ? "overdue" : "pending";
    }
    const currentChild = config.model === "Child" ? await findScopedRecord(req, config).select("classGroup status") : null;
    if (config.model === "Child" && !currentChild) return res.status(404).json({ success: false, message: "Record not found" });
    if (req.user.role === "caregiver" && config.model === "Child") return res.status(403).json({ success: false, message: "Caregivers cannot change child profiles" });
    const nextClassGroup = config.model === "Child" ? (changes.classGroup !== undefined ? changes.classGroup : currentChild?.classGroup) : null;
    const movingClass = config.model === "Child" && changes.classGroup !== undefined && String(changes.classGroup || "") !== String(currentChild?.classGroup || "");
    const reactivating = config.model === "Child" && currentChild?.status === "inactive" && changes.status === "active";
    const nextWillBeActive = config.model === "Child" && (currentChild?.status !== "inactive" || changes.status === "active");
    if (config.model === "Child" && nextClassGroup && (movingClass || reactivating) && nextWillBeActive) {
      const reservation = await req.models.ClassGroup.updateOne({ _id: nextClassGroup, status: "active", $expr: { $lt: [{ $size: { $ifNull: ["$children", []] } }, "$capacity"] } }, { $addToSet: { children: req.params.recordId } });
      if (!reservation.matchedCount) return res.status(400).json({ success: false, message: "This class is inactive or has reached its capacity" });
      reservedClassId = nextClassGroup;
    }
    if (config.model === "CenterNotification" && changes.status === "sent" && previousNotification?.status !== "sent") changes.sentAt = new Date();
    const record = await config.Model.findOneAndUpdate({ _id: req.params.recordId, ...(await caregiverScope(req, req.params.module) || {}) }, { $set: changes }, { new: true, runValidators: true });
    if (!record) {
      if (reservedClassId) await req.models.ClassGroup.updateOne({ _id: reservedClassId }, { $pull: { children: req.params.recordId } });
      reservedClassId = null;
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    if (config.model === "CenterNotification" && previousNotification?.status !== "sent") await publishCenterNotification(req, record);
    if (config.model === "DaycareParent") {
      if (changes.email !== undefined && changes.email !== currentParent.email) {
        await req.mainModels.ParentTenantLink.updateOne({ tenant: req.tenant._id, daycareParent: record._id }, { $set: { isActive: false } });
        await syncParentTenantLink(req, record);
      } else {
        await req.mainModels.ParentTenantLink.updateOne({ tenant: req.tenant._id, daycareParent: record._id }, { $set: { isActive: record.status !== "inactive" } });
      }
    }
    reservedClassId = null;
    if (config.model === "Child" && currentChild && (String(currentChild.classGroup || "") !== String(record.classGroup || "") || (currentChild.status !== "inactive" && record.status === "inactive"))) {
      if (currentChild.classGroup) await req.models.ClassGroup.updateOne({ _id: currentChild.classGroup }, { $pull: { children: record._id } });
    }
    await writeAudit(req, "updated", req.params.module, record._id, { changedFields: Object.keys(changes) });
    if (config.model === "Staff" && changes.status === "inactive" && record.userAccount) {
      await req.mainModels.TenantMembership.updateOne({ tenant: req.tenant._id, user: record.userAccount }, { $set: { isActive: false } });
      await req.models.User.updateOne({ _id: record.userAccount }, { $set: { isActive: false }, $inc: { tokenVersion: 1 } });
    }
    return res.json({ success: true, record, message: "Record updated successfully" });
  } catch (error) {
    if (reservedClassId) await req.models.ClassGroup.updateOne({ _id: reservedClassId }, { $pull: { children: req.params.recordId } }).catch(() => {});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ success: false, message: error.message });
    console.error(`Daycare ${req.params.module} update failed:`, error.message);
    return res.status(503).json({ success: false, message: "Record could not be updated" });
  }
}

async function deleteRecord(req, res) {
  const config = moduleConfig(req, res);
  if (!config) return;
  if (config.readOnly) return res.status(405).json({ success: false, message: "This module is read-only" });
  if (!validId(req.params.recordId)) return res.status(400).json({ success: false, message: "Invalid record id" });
  try {
    let record;
    const scope = await caregiverScope(req, req.params.module);
    if (config.softDelete) record = await config.Model.findOneAndUpdate({ _id: req.params.recordId, ...(scope || {}) }, { $set: { status: "inactive" } }, { new: true, runValidators: true });
    else {
      const query = config.Model.findOneAndDelete({ _id: req.params.recordId, ...(scope || {}) });
      if (config.model === "DaycareDocument") query.select("+storageKey mimeType");
      record = await query;
    }
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    if (config.model === "DaycareParent") await req.mainModels.ParentTenantLink.updateOne({ tenant: req.tenant._id, daycareParent: record._id }, { $set: { isActive: false } });
    if (config.model === "Staff" && record.userAccount) {
      await req.mainModels.TenantMembership.updateOne({ tenant: req.tenant._id, user: record.userAccount }, { $set: { isActive: false } });
      await req.models.User.updateOne({ _id: record.userAccount }, { $set: { isActive: false }, $inc: { tokenVersion: 1 } });
    }
    if (config.model === "DaycareDocument" && record.storageKey) {
      const extension = DOCUMENT_TYPES[record.mimeType]?.extension;
      if (extension) await fs.unlink(path.join(__dirname, "..", "private_uploads", "daycare", req.tenant._id.toString(), `${path.basename(record.storageKey)}${extension}`)).catch(() => {});
    }
    if (config.model === "Child" && record.classGroup) await req.models.ClassGroup.updateOne({ _id: record.classGroup }, { $pull: { children: record._id } });
    await writeAudit(req, config.softDelete ? "deactivated" : "deleted", req.params.module, record._id);
    return res.json({ success: true, message: config.softDelete ? "Record deactivated" : "Record deleted" });
  } catch (error) {
    console.error(`Daycare ${req.params.module} delete failed:`, error.message);
    return res.status(503).json({ success: false, message: "Record could not be removed" });
  }
}

const DOCUMENT_TYPES = {
  "application/pdf": { extension: ".pdf", valid: (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-" },
  "image/jpeg": { extension: ".jpg", valid: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: ".png", valid: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: ".webp", valid: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
};

async function uploadDocument(req, res) {
  const buffer = req.body;
  const contentType = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  const format = DOCUMENT_TYPES[contentType];
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 10 * 1024 * 1024 || !format || !format.valid(buffer)) return res.status(400).json({ success: false, message: "Upload a valid PDF, JPG, PNG, or WebP file up to 10 MB" });
  const { title, category = "other", child, parent, staff, documentId } = req.query;
  if (!String(title || "").trim()) return res.status(400).json({ success: false, message: "Document title is required" });
  if (documentId && !validId(documentId)) return res.status(400).json({ success: false, message: "Invalid document id" });
  if (req.user.role === "caregiver") {
    const childScope = await caregiverScope(req, "children");
    const staffRecord = await req.models.Staff.findOne({ userAccount: req.user.userId, status: "active" }).select("_id").lean();
    const assignedChild = child && await req.models.Child.exists({ _id: child, $and: [childScope] });
    const ownStaffDocument = staff && staffRecord && String(staff) === String(staffRecord._id);
    if (!assignedChild && !ownStaffDocument) return res.status(403).json({ success: false, message: "You can only upload files for your assigned children or your staff profile" });
  }
  let existing;
  if (documentId) {
    existing = await req.models.DaycareDocument.findById(documentId).select("storageKey mimeType");
    if (!existing) return res.status(404).json({ success: false, message: "Document not found" });
  }
  const storageKey = randomUUID();
  const directory = path.join(__dirname, "..", "private_uploads", "daycare", req.tenant._id.toString());
  const filePath = path.join(directory, `${storageKey}${format.extension}`);
  try {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o600 });
    const fields = { title: String(title).trim(), category, child: child || undefined, parent: parent || undefined, staff: staff || undefined, storageKey, fileUrl: "", mimeType: contentType, fileSize: buffer.length, uploadedBy: req.user.userId };
    const record = existing
      ? await req.models.DaycareDocument.findByIdAndUpdate(documentId, { $set: fields }, { new: true, runValidators: true })
      : await req.models.DaycareDocument.create(fields);
    record.fileUrl = `/daycare/management/documents/${record._id}/file`;
    await record.save();
    if (existing?.storageKey) {
      const oldExtension = DOCUMENT_TYPES[existing.mimeType]?.extension;
      const oldPath = oldExtension ? path.join(directory, `${path.basename(existing.storageKey)}${oldExtension}`) : null;
      if (oldPath) await fs.unlink(oldPath).catch(() => {});
    }
    await writeAudit(req, existing ? "updated" : "created", "documents", record._id, { title: record.title });
    const safeRecord = record.toObject();
    delete safeRecord.storageKey;
    return res.status(existing ? 200 : 201).json({ success: true, record: safeRecord });
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ success: false, message: error.message });
    console.error("Daycare document upload failed:", error.message);
    return res.status(503).json({ success: false, message: "Document could not be uploaded" });
  }
}

async function downloadDocument(req, res) {
  if (!validId(req.params.recordId)) return res.status(400).json({ success: false, message: "Invalid document id" });
  try {
    const scope = await caregiverScope(req, "documents");
    const record = await req.models.DaycareDocument.findOne({ _id: req.params.recordId, ...(scope || {}) }).select("+storageKey title mimeType");
    if (!record?.storageKey) return res.status(404).json({ success: false, message: "Document not found" });
    const fileName = path.basename(record.storageKey);
    const directory = path.join(__dirname, "..", "private_uploads", "daycare", req.tenant._id.toString());
    const extension = DOCUMENT_TYPES[record.mimeType]?.extension;
    if (!extension) return res.status(404).json({ success: false, message: "Document file is unavailable" });
    const filePath = path.join(directory, `${fileName}${extension}`);
    res.set({ "Content-Type": record.mimeType, "Content-Disposition": `attachment; filename="${String(record.title).replace(/[\r\n"\\]/g, "_")}${extension}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
    return res.sendFile(filePath, (error) => { if (error && !res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Document file is unavailable" }); });
  } catch (error) {
    console.error("Daycare document download failed:", error.message);
    return res.status(503).json({ success: false, message: "Document could not be downloaded" });
  }
}

const PROFILE_IMAGE_TYPES = {
  "image/jpeg": { extension: ".jpg", valid: (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  "image/png": { extension: ".png", valid: (data) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: ".webp", valid: (data) => data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" },
};
const PROFILE_PHOTO_FIELDS = { children: "profilePhoto", parents: "profilePhoto", staff: "profilePhoto", pickupPersons: "photo" };

async function uploadProfilePhoto(req, res) {
  const field = PROFILE_PHOTO_FIELDS[req.params.module];
  const config = field && MODULES[req.params.module];
  if (!config || !config.fields.includes(field)) return res.status(404).json({ success: false, message: "Profile photo target is not supported" });
  if (!validId(req.params.recordId)) return res.status(400).json({ success: false, message: "Invalid record id" });
  const contentType = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  const type = PROFILE_IMAGE_TYPES[contentType];
  if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > 3 * 1024 * 1024 || !type || !type.valid(req.body)) return res.status(400).json({ success: false, message: "Upload a valid JPG, PNG, or WebP image up to 3 MB" });
  try {
    const scope = await caregiverScope(req, req.params.module);
    const record = await req.models[config.model].findOne({ _id: req.params.recordId, ...(scope || {}) }).select(field);
    if (!record) return res.status(404).json({ success: false, message: "Profile record not found" });
    const storageKey = `${randomUUID()}${type.extension}`;
    const directory = path.join(__dirname, "..", "private_uploads", "daycare", req.tenant._id.toString(), "profile_photos");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, storageKey), req.body, { flag: "wx", mode: 0o600 });
    const previousKey = typeof record[field] === "string" && record[field].startsWith("private:") ? record[field].slice("private:".length) : "";
    record[field] = `private:${storageKey}`;
    await record.save();
    if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(previousKey)) await fs.unlink(path.join(directory, previousKey)).catch(() => {});
    await writeAudit(req, "updated", req.params.module, record._id, { changedFields: ["profilePhoto"] });
    return res.json({ success: true, photoUrl: `/daycare/management/${req.params.module}/${record._id}/photo` });
  } catch (error) {
    console.error("Daycare profile photo upload failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be uploaded" });
  }
}

async function getProfilePhoto(req, res) {
  const field = PROFILE_PHOTO_FIELDS[req.params.module];
  const config = field && MODULES[req.params.module];
  if (!config || !validId(req.params.recordId)) return res.status(404).json({ success: false, message: "Profile photo not found" });
  try {
    const scope = await caregiverScope(req, req.params.module);
    const record = await req.models[config.model].findOne({ _id: req.params.recordId, ...(scope || {}) }).select(field).lean();
    const storageKey = typeof record?.[field] === "string" && record[field].startsWith("private:") ? record[field].slice("private:".length) : "";
    const match = storageKey.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/);
    if (!match) return res.status(404).json({ success: false, message: "Profile photo not found" });
    const mimeType = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[match[2]];
    const filePath = path.join(__dirname, "..", "private_uploads", "daycare", req.tenant._id.toString(), "profile_photos", storageKey);
    res.set({ "Content-Type": mimeType, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
    return res.sendFile(filePath, (error) => { if (error && !res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Profile photo is unavailable" }); });
  } catch (error) {
    console.error("Daycare profile photo read failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be loaded" });
  }
}

async function recordFeePayment(req, res) {
  if (!validId(req.params.recordId)) return res.status(400).json({ success: false, message: "Invalid invoice id" });
  const amount = Number(req.body?.amount);
  const paymentDate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();
  const allowedMethods = ["cash", "card", "bank", "jazzcash", "easypaisa", "other"];
  if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(paymentDate.getTime()) || !allowedMethods.includes(req.body?.paymentMethod)) return res.status(400).json({ success: false, message: "Enter a valid amount, date, and payment method" });
  const invoiceModel = req.models.FeeInvoice;
  try {
    const invoice = await invoiceModel.findOneAndUpdate(
      { _id: req.params.recordId, $expr: { $lte: [{ $add: [{ $ifNull: ["$paidAmount", 0] }, amount] }, "$amount"] } },
      { $inc: { paidAmount: amount }, $push: { payments: { amount, paymentDate, paymentMethod: req.body.paymentMethod, transactionReference: String(req.body.transactionReference || "").trim(), receivedBy: req.user.userId } } },
      { new: true, runValidators: true },
    );
    if (!invoice) {
      const exists = await invoiceModel.exists({ _id: req.params.recordId });
      return exists ? res.status(400).json({ success: false, message: "Payment exceeds the remaining invoice balance" }) : res.status(404).json({ success: false, message: "Invoice not found" });
    }
    await invoiceModel.updateOne({ _id: invoice._id }, [{ $set: { status: { $cond: [{ $gte: ["$paidAmount", "$amount"] }, "paid", { $cond: [{ $gt: ["$paidAmount", 0] }, "partially-paid", { $cond: [{ $lt: ["$dueDate", new Date()] }, "overdue", "pending"] }] }] }, paidAt: { $cond: [{ $gte: ["$paidAmount", "$amount"] }, paymentDate, "$paidAt"] }, paymentMethod: req.body.paymentMethod, transactionReference: String(req.body.transactionReference || "").trim() } }]);
    const updated = await invoiceModel.findById(invoice._id).populate(MODULES.fees.populate).lean();
    await writeAudit(req, "payment-recorded", "fees", invoice._id, { amount, paymentMethod: req.body.paymentMethod, transactionReference: req.body.transactionReference || "" });
    return res.status(201).json({ success: true, record: updated });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ success: false, message: error.message });
    console.error("Daycare fee payment failed:", error.message);
    return res.status(503).json({ success: false, message: "Payment could not be recorded" });
  }
}

async function saveSettings(req, res) {
  const fields = ["daycareName", "logo", "email", "phone", "alternatePhone", "address", "city", "province", "country", "postalCode", "website", "description", "openingTime", "closingTime", "workingDays", "emergencyContact", "licenseNumber", "defaultMonthlyFee", "registrationFee", "lateFee", "attendanceGraceMinutes", "notifyParentsOnAttendance"];
  try {
    const changes = pickFields(req.body || {}, fields);
    changes.updatedBy = req.user.userId;
    const settings = await req.models.DaycareSettings.findOneAndUpdate({}, { $set: changes }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAudit(req, "updated", "settings", settings._id, { changedFields: Object.keys(changes) });
    return res.json({ success: true, settings });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ success: false, message: error.message });
    console.error("Daycare settings update failed:", error.message);
    return res.status(503).json({ success: false, message: "Settings could not be saved" });
  }
}

async function getOverview(req, res) {
  try {
    const { Child, DaycareParent, Staff, Attendance, StaffAttendance, FeeInvoice, Complaint, ParentRequest, DaycareEvent, AuditLog, DaycareSettings } = req.models;
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    if (req.user.role === "caregiver") {
      const staffMember = await Staff.findOne({ userAccount: req.user.userId, status: "active" }).select("_id assignedClass").lean();
      const childScope = staffMember ? { status: { $ne: "inactive" }, $or: [{ assignedCaregiver: staffMember._id }, ...(staffMember.assignedClass ? [{ classGroup: staffMember.assignedClass }] : [])] } : { _id: { $in: [] } };
      const assignedChildren = await Child.find(childScope).distinct("_id");
      const childFilter = { child: { $in: assignedChildren } };
      const [children, presentToday, absentToday, checkIns, checkOuts, recentActivities] = await Promise.all([
        Child.countDocuments(childScope), Attendance.countDocuments({ ...childFilter, date: { $gte: dayStart, $lte: dayEnd }, status: "present" }),
        Attendance.countDocuments({ ...childFilter, date: { $gte: dayStart, $lte: dayEnd }, status: { $in: ["absent", "excused"] } }),
        Attendance.countDocuments({ ...childFilter, checkIn: { $gte: dayStart, $lte: dayEnd } }), Attendance.countDocuments({ ...childFilter, checkOut: { $gte: dayStart, $lte: dayEnd } }),
        AuditLog.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(8).lean(),
      ]);
      const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const [enrollment, attendanceByMonth] = await Promise.all([
        Child.aggregate([{ $match: { _id: { $in: assignedChildren }, createdAt: { $gte: chartStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
        Attendance.aggregate([{ $match: { ...childFilter, date: { $gte: chartStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      ]);
      const overview = { children, activeChildren: children, parents: 0, staff: 0, presentToday, absentToday, staffAttendanceToday: 0, pendingFees: 0, paidFees: 0, pendingComplaints: 0, pendingRequests: 0, upcomingEvents: 0, checkIns, checkOuts, staffCheckIns: 0, staffCheckOuts: 0, recentActivities, charts: { enrollment, attendance: attendanceByMonth, fees: [], complaints: [] } };
      return res.json({ success: true, overview });
    }
    const [children, activeChildren, parents, staff, presentToday, absentToday, staffAttendanceToday, pendingFees, paidFees, pendingComplaints, pendingRequests, upcomingEvents, checkIns, checkOuts, staffCheckIns, staffCheckOuts, recentActivities, settings] = await Promise.all([
      Child.countDocuments({}), Child.countDocuments({ status: { $ne: "inactive" } }), DaycareParent.countDocuments({ status: { $ne: "inactive" } }), Staff.countDocuments({ status: "active" }),
      Attendance.countDocuments({ date: { $gte: dayStart, $lte: dayEnd }, status: "present" }), Attendance.countDocuments({ date: { $gte: dayStart, $lte: dayEnd }, status: { $in: ["absent", "excused"] } }),
      StaffAttendance.countDocuments({ date: { $gte: dayStart, $lte: dayEnd }, status: { $in: ["present", "late"] } }),
      FeeInvoice.aggregate([{ $match: { status: { $in: ["pending", "partially-paid", "overdue"] } } }, { $group: { _id: null, amount: { $sum: { $subtract: ["$amount", "$paidAmount"] } } } }]),
      FeeInvoice.aggregate([{ $group: { _id: null, amount: { $sum: "$paidAmount" } } }]),
      Complaint.countDocuments({ status: "pending" }), ParentRequest.countDocuments({ status: "pending" }), DaycareEvent.countDocuments({ date: { $gte: now }, status: "scheduled" }),
      Attendance.countDocuments({ checkIn: { $gte: dayStart, $lte: dayEnd } }), Attendance.countDocuments({ checkOut: { $gte: dayStart, $lte: dayEnd } }),
      StaffAttendance.countDocuments({ checkIn: { $gte: dayStart, $lte: dayEnd } }), StaffAttendance.countDocuments({ checkOut: { $gte: dayStart, $lte: dayEnd } }),
      AuditLog.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(10).lean(), DaycareSettings.findOne({}).lean(),
    ]);
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const [enrollment, attendanceByMonth, feeByMonth, complaintStatuses, staffAttendanceByMonth, feeStatuses] = await Promise.all([
      Child.aggregate([{ $match: { createdAt: { $gte: chartStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Attendance.aggregate([{ $match: { date: { $gte: chartStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      FeeInvoice.aggregate([{ $match: { createdAt: { $gte: chartStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, amount: { $sum: "$paidAmount" } } }, { $sort: { _id: 1 } }]),
      Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      StaffAttendance.aggregate([{ $match: { date: { $gte: chartStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      FeeInvoice.aggregate([{ $group: { _id: "$status", amount: { $sum: "$amount" }, paid: { $sum: "$paidAmount" } } }, { $sort: { _id: 1 } }]),
    ]);
    return res.json({ success: true, overview: { children, activeChildren, parents, staff, presentToday, absentToday, staffAttendanceToday, pendingFees: pendingFees[0]?.amount || 0, paidFees: paidFees[0]?.amount || 0, pendingComplaints, pendingRequests, upcomingEvents, checkIns, checkOuts, staffCheckIns, staffCheckOuts, recentActivities, settings, charts: { enrollment, attendance: attendanceByMonth, fees: feeByMonth, complaints: complaintStatuses, staffAttendance: staffAttendanceByMonth, feeStatuses } } });
  } catch (error) {
    console.error("Daycare dashboard overview failed:", error.message);
    return res.status(503).json({ success: false, message: "Dashboard overview is temporarily unavailable" });
  }
}

async function getSettings(req, res) {
  try {
    const settings = await req.models.DaycareSettings.findOne({}).lean();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error("Daycare settings read failed:", error.message);
    return res.status(503).json({ success: false, message: "Settings are temporarily unavailable" });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
  try {
    const user = await req.models.User.findById(req.user.userId).select("password");
    if (!user || typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ success: false, message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await writeAudit(req, "password-changed", "security", user._id);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Daycare password update failed:", error.message);
    return res.status(503).json({ success: false, message: "Password could not be changed" });
  }
}

async function getAccountProfile(req, res) {
  try {
    const user = await req.models.User.findOne({ _id: req.user.userId, isActive: true }).select("name email phone profilePhoto role isActive").lean();
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    return res.json({ success: true, user });
  } catch (error) {
    console.error("Daycare account profile read failed:", error.message);
    return res.status(503).json({ success: false, message: "Account profile could not be loaded" });
  }
}

async function updateAccountProfile(req, res) {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  if (name.length < 2 || name.length > 50) return res.status(400).json({ success: false, message: "Name must be between 2 and 50 characters" });
  if (!phone || phone.length > 30) return res.status(400).json({ success: false, message: "Enter a valid phone number" });
  try {
    const user = await req.models.User.findOne({ _id: req.user.userId, isActive: true }).select("name email phone profilePhoto role isActive");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    user.name = name;
    user.phone = phone;
    await user.save();
    await writeAudit(req, "updated", "account-profile", user._id, { changedFields: ["name", "phone"] });
    return res.json({ success: true, user: { name: user.name, email: user.email, phone: user.phone, profilePhoto: user.profilePhoto || "", role: user.role, isActive: user.isActive } });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ success: false, message: error.message });
    console.error("Daycare account profile update failed:", error.message);
    return res.status(503).json({ success: false, message: "Account profile could not be updated" });
  }
}

const accountPhotoDirectory = (tenantId) => path.join(__dirname, "..", "private_uploads", "daycare", String(tenantId), "account_photos");

async function uploadAccountPhoto(req, res) {
  const contentType = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  const type = PROFILE_IMAGE_TYPES[contentType];
  if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > 3 * 1024 * 1024 || !type || !type.valid(req.body)) return res.status(400).json({ success: false, message: "Upload a valid JPG, PNG, or WebP image up to 3 MB" });
  try {
    const user = await req.models.User.findOne({ _id: req.user.userId, isActive: true }).select("profilePhoto");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    const storageKey = `${randomUUID()}${type.extension}`;
    const directory = accountPhotoDirectory(req.tenant._id);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, storageKey), req.body, { flag: "wx", mode: 0o600 });
    const previousKey = typeof user.profilePhoto === "string" && user.profilePhoto.startsWith("private:") ? user.profilePhoto.slice("private:".length) : "";
    user.profilePhoto = `private:${storageKey}`;
    await user.save();
    if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(previousKey)) await fs.unlink(path.join(directory, previousKey)).catch(() => {});
    await writeAudit(req, "updated", "account-profile", user._id, { changedFields: ["profilePhoto"] });
    return res.json({ success: true, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error("Daycare account photo upload failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be uploaded" });
  }
}

async function getAccountPhoto(req, res) {
  try {
    const user = await req.models.User.findOne({ _id: req.user.userId, isActive: true }).select("profilePhoto").lean();
    const storageKey = typeof user?.profilePhoto === "string" && user.profilePhoto.startsWith("private:") ? user.profilePhoto.slice("private:".length) : "";
    const match = storageKey.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/);
    if (!match) return res.status(404).json({ success: false, message: "Profile photo not found" });
    const mimeType = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[match[2]];
    const filePath = path.join(accountPhotoDirectory(req.tenant._id), storageKey);
    res.set({ "Content-Type": mimeType, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
    return res.sendFile(filePath, (error) => { if (error && !res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Profile photo is unavailable" }); });
  } catch (error) {
    console.error("Daycare account photo read failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be loaded" });
  }
}

async function deleteAccountPhoto(req, res) {
  try {
    const user = await req.models.User.findOne({ _id: req.user.userId, isActive: true }).select("profilePhoto");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    const storageKey = typeof user.profilePhoto === "string" && user.profilePhoto.startsWith("private:") ? user.profilePhoto.slice("private:".length) : "";
    user.profilePhoto = undefined;
    await user.save();
    if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(storageKey)) await fs.unlink(path.join(accountPhotoDirectory(req.tenant._id), storageKey)).catch(() => {});
    await writeAudit(req, "updated", "account-profile", user._id, { changedFields: ["profilePhoto"] });
    return res.json({ success: true });
  } catch (error) {
    console.error("Daycare account photo delete failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be removed" });
  }
}

module.exports = { listRecords, createRecord, updateRecord, deleteRecord, getOverview, getSettings, saveSettings, listUsers, createUser, updateUser, deleteUser, resetParentPassword, logLogout, uploadDocument, downloadDocument, uploadProfilePhoto, getProfilePhoto, recordFeePayment, changePassword, getAccountProfile, updateAccountProfile, uploadAccountPhoto, getAccountPhoto, deleteAccountPhoto };
