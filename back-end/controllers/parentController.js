const { getTenantConnection, getTenantModels } = require("../config/db");
const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");

const PARENT_IMAGE_TYPES = {
  "image/jpeg": { extension: ".jpg", valid: (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  "image/png": { extension: ".png", valid: (data) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: ".webp", valid: (data) => data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" },
};

const parentPhotoDirectory = (userId) => path.join(__dirname, "..", "private_uploads", "parents", String(userId), "profile_photo");

async function getParentProfilePhoto(req, res) {
  try {
    const user = await req.mainModels.User.findOne({ _id: req.user.userId, role: "parent", isActive: true }).select("profilePhoto").lean();
    const storageKey = typeof user?.profilePhoto === "string" && user.profilePhoto.startsWith("private:") ? user.profilePhoto.slice("private:".length) : "";
    const match = storageKey.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/);
    if (!match) return res.status(404).json({ success: false, message: "Profile photo not found" });
    const mimeType = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[match[2]];
    const filePath = path.join(parentPhotoDirectory(req.user.userId), storageKey);
    res.set({ "Content-Type": mimeType, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
    return res.sendFile(filePath, (error) => { if (error && !res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Profile photo is unavailable" }); });
  } catch (error) {
    console.error("Parent profile photo read failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be loaded" });
  }
}

async function uploadParentProfilePhoto(req, res) {
  const contentType = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  const type = PARENT_IMAGE_TYPES[contentType];
  if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > 3 * 1024 * 1024 || !type || !type.valid(req.body)) return res.status(400).json({ success: false, message: "Upload a valid JPG, PNG, or WebP image up to 3 MB" });
  try {
    const user = await req.mainModels.User.findOne({ _id: req.user.userId, role: "parent", isActive: true }).select("profilePhoto");
    if (!user) return res.status(404).json({ success: false, message: "Parent account not found" });
    const storageKey = `${randomUUID()}${type.extension}`;
    const directory = parentPhotoDirectory(req.user.userId);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, storageKey), req.body, { flag: "wx", mode: 0o600 });
    const previousKey = typeof user.profilePhoto === "string" && user.profilePhoto.startsWith("private:") ? user.profilePhoto.slice("private:".length) : "";
    user.profilePhoto = `private:${storageKey}`;
    await user.save();
    if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(previousKey)) await fs.unlink(path.join(directory, previousKey)).catch(() => {});
    return res.json({ success: true, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error("Parent profile photo upload failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be uploaded" });
  }
}

async function deleteParentProfilePhoto(req, res) {
  try {
    const user = await req.mainModels.User.findOne({ _id: req.user.userId, role: "parent", isActive: true }).select("profilePhoto");
    if (!user) return res.status(404).json({ success: false, message: "Parent account not found" });
    const storageKey = typeof user.profilePhoto === "string" && user.profilePhoto.startsWith("private:") ? user.profilePhoto.slice("private:".length) : "";
    user.profilePhoto = undefined;
    await user.save();
    if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(storageKey)) await fs.unlink(path.join(parentPhotoDirectory(req.user.userId), storageKey)).catch(() => {});
    return res.json({ success: true });
  } catch (error) {
    console.error("Parent profile photo delete failed:", error.message);
    return res.status(503).json({ success: false, message: "Profile photo could not be removed" });
  }
}

async function getParentPortal(req, res) {
  try {
    const links = await req.mainModels.ParentTenantLink.find({ parentUser: req.user.userId, isActive: true }).select("tenant daycareParent email").lean();
    const daycares = [];

    for (const link of links) {
      const tenant = await req.mainModels.Tenant.findOne({ _id: link.tenant, status: "active" }).select("name listingStatus databaseName ownerUserId").lean();
      if (!tenant) continue;
      try {
        const models = getTenantModels(getTenantConnection(tenant.databaseName));
        const parent = await models.DaycareParent.findOne({ _id: link.daycareParent, status: "active" }).select("name email phone address emergencyContactName emergencyContactPhone").lean();
        if (!parent) continue;
        const childFilter = { status: { $ne: "inactive" }, $or: [{ parentContact: parent._id }, { parent: req.user.userId }] };
        const children = await models.Child.find(childFilter).select("name profilePhoto dateOfBirth gender enrollmentDate classGroup assignedCaregiver").populate([{ path: "classGroup", select: "name" }, { path: "assignedCaregiver", select: "fullName" }]).sort({ name: 1 }).lean();
        const childIds = children.map((child) => child._id);
        const classIds = [...new Set(children.map((child) => child.classGroup?._id).filter(Boolean))];
        const parentFilter = { $or: [{ parent: parent._id }, { child: { $in: childIds } }] };
        const [attendance, activities, invoices, bookings, payments, complaints, requests, notifications, announcements, events] = await Promise.all([
          models.Attendance.find({ child: { $in: childIds } }).select("child date status checkIn checkOut notes").populate("child", "name").sort({ date: -1 }).limit(100).lean(),
          models.DailyActivity.find({ child: { $in: childIds }, sharedWithParent: true }).select("child date meals snacks nap toileting activities mood behavior healthObservations medication notes createdAt").populate("child", "name").sort({ date: -1 }).limit(100).lean(),
          models.FeeInvoice.find(parentFilter).select("invoiceNumber child description amount paidAmount dueDate paidAt paymentMethod status transactionReference payments createdAt").populate([{ path: "child", select: "name" }, { path: "payments.receivedBy", select: "name" }]).sort({ dueDate: -1 }).limit(100).lean(),
          models.Booking.find({ parent: req.user.userId, daycare: tenant.ownerUserId, child: { $in: childIds } }).select("child startDate endDate supportType status notes createdAt").populate("child", "name").sort({ createdAt: -1 }).limit(100).lean(),
          models.Payment.find({ parent: req.user.userId, daycare: tenant.ownerUserId }).select("booking amount paymentMethod status transactionId paidAt createdAt").sort({ createdAt: -1 }).limit(100).lean(),
          models.Complaint.find({ parent: parent._id }).select("complaintNumber subject description priority status response history createdAt updatedAt").sort({ createdAt: -1 }).limit(100).lean(),
          models.ParentRequest.find({ parent: parent._id }).select("requestType subject description status adminRemarks createdAt updatedAt").sort({ createdAt: -1 }).limit(100).lean(),
          models.CenterNotification.find({ status: "sent", $or: [{ audience: { $in: ["all-parents", "all"] } }, { parent: parent._id, audience: "parent" }, ...(classIds.length ? [{ classGroup: { $in: classIds }, audience: "class" }] : []), ...(children.length ? [{ child: { $in: children.map((child) => child._id) }, audience: "child" }] : [])] }).select("title message type audience sentAt createdAt child").sort({ sentAt: -1 }).limit(50).lean(),
          models.Announcement.find({ status: "published", startDate: { $lte: new Date() }, $and: [{ $or: [{ endDate: null }, { endDate: { $gte: new Date() } }] }, { $or: [{ audience: { $in: ["all", "parents"] } }, ...(classIds.length ? [{ classGroup: { $in: classIds }, audience: "class" }] : [])] }] }).select("title description attachment startDate endDate audience createdAt").sort({ startDate: -1 }).limit(50).lean(),
          models.DaycareEvent.find({ status: "scheduled", date: { $gte: new Date() }, $or: [{ audience: { $in: ["everyone", "parents"] } }, ...(classIds.length ? [{ classGroup: { $in: classIds }, audience: "class" }] : [])] }).select("name description date startTime endTime location audience reminderAt").sort({ date: 1 }).limit(50).lean(),
        ]);
        daycares.push({
          id: tenant._id, name: tenant.name, listingStatus: tenant.listingStatus,
          parent, children, attendance, activities, invoices, bookings, payments, complaints, requests, notifications, announcements, events,
        });
      } catch (error) {
        console.error("Parent tenant portal read failed:", error.message);
      }
    }

    return res.json({ success: true, daycares });
  } catch (error) {
    console.error("Parent portal read failed:", error.message);
    return res.status(503).json({ success: false, message: "Family information is temporarily unavailable" });
  }
}

async function getParentChildPhoto(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.tenantId) || !/^[a-f\d]{24}$/i.test(req.params.childId)) return res.status(400).json({ success: false, message: "Invalid child photo id" });
  const link = await req.mainModels.ParentTenantLink.findOne({ tenant: req.params.tenantId, parentUser: req.user.userId, isActive: true }).select("daycareParent").lean();
  if (!link) return res.status(404).json({ success: false, message: "Child profile not found" });
  try {
    const tenant = await req.mainModels.Tenant.findOne({ _id: req.params.tenantId, status: "active" }).select("databaseName").lean();
    if (!tenant) return res.status(404).json({ success: false, message: "Child profile not found" });
    const models = getTenantModels(getTenantConnection(tenant.databaseName));
    const child = await models.Child.findOne({ _id: req.params.childId, status: { $ne: "inactive" }, $or: [{ parentContact: link.daycareParent }, { parent: req.user.userId }] }).select("profilePhoto").lean();
    const key = typeof child?.profilePhoto === "string" && child.profilePhoto.startsWith("private:") ? child.profilePhoto.slice("private:".length) : "";
    const match = key.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/);
    if (!match) return res.status(404).json({ success: false, message: "Child profile photo not found" });
    const extension = match[2];
    const mimeType = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[extension];
    const filePath = path.join(__dirname, "..", "private_uploads", "daycare", String(req.params.tenantId), "profile_photos", key);
    res.set({ "Content-Type": mimeType, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
    return res.sendFile(filePath, (error) => { if (error && !res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Child profile photo is unavailable" }); });
  } catch (error) {
    console.error("Parent child photo read failed:", error.message);
    return res.status(503).json({ success: false, message: "Child profile photo could not be loaded" });
  }
}

async function resolveLinkedParent(req, tenantId) {
  const link = await req.mainModels.ParentTenantLink.findOne({ tenant: tenantId, parentUser: req.user.userId, isActive: true }).select("tenant daycareParent").lean();
  if (!link) return null;
  const tenant = await req.mainModels.Tenant.findOne({ _id: link.tenant, status: "active" }).select("databaseName ownerUserId").lean();
  if (!tenant) return null;
  const models = getTenantModels(getTenantConnection(tenant.databaseName));
  const parent = await models.DaycareParent.findOne({ _id: link.daycareParent, status: "active", parentUser: req.user.userId }).select("_id").lean();
  if (!parent) return null;
  return { tenant, models, parent };
}

async function createParentItem(req, res, kind) {
  try {
    const linked = await resolveLinkedParent(req, req.params.tenantId);
    if (!linked) return res.status(404).json({ success: false, message: "Linked daycare was not found" });
    const { models, parent, tenant } = linked;
    const body = req.body || {};
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!subject || subject.length > 160 || !description || description.length > (kind === "complaint" ? 5000 : 3000)) {
      return res.status(400).json({ success: false, message: "Enter a subject and description within the allowed length" });
    }
    let child = null;
    if (body.childId) {
      child = await models.Child.findOne({ _id: body.childId, status: { $ne: "inactive" }, $or: [{ parentContact: parent._id }, { parent: req.user.userId }] }).select("_id").lean();
      if (!child) return res.status(400).json({ success: false, message: "Select one of your linked children" });
    }
    const record = kind === "complaint"
      ? await models.Complaint.create({ complaintNumber: `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`, parent: parent._id, child: child?._id, subject, description, priority: "normal", createdBy: req.user.userId })
      : await models.ParentRequest.create({ parent: parent._id, child: child?._id, requestType: ["pickup-dropoff", "information-update", "schedule", "document", "other"].includes(body.requestType) ? body.requestType : "other", subject, description, status: "pending", createdBy: req.user.userId });
    return res.status(201).json({ success: true, record, daycareId: tenant._id });
  } catch (error) {
    console.error(`Parent ${kind} creation failed:`, error.message);
    return res.status(503).json({ success: false, message: "Your request could not be submitted right now" });
  }
}

const createComplaint = (req, res) => createParentItem(req, res, "complaint");
const createRequest = (req, res) => createParentItem(req, res, "request");

async function getParentProfile(req, res) {
  try {
    const user = await req.mainModels.User.findOne({ _id: req.user.userId, role: "parent", isActive: true })
      .select("name email phone profilePhoto address area emergencyContactName emergencyContactPhone emergencyContactRelationship emergencyContactDetails childcareType careStartTime careEndTime")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "Parent account not found" });
    return res.json({ success: true, profile: user });
  } catch (error) {
    console.error("Parent profile read failed:", error.message);
    return res.status(503).json({ success: false, message: "Your profile could not be loaded right now" });
  }
}

async function updateParentProfile(req, res) {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
    const area = typeof req.body.area === "string" ? req.body.area.trim() : "";
    const emergencyContactName = typeof req.body.emergencyContactName === "string" ? req.body.emergencyContactName.trim() : "";
    const emergencyContactPhone = typeof req.body.emergencyContactPhone === "string" ? req.body.emergencyContactPhone.trim() : "";
    const emergencyContactRelationship = typeof req.body.emergencyContactRelationship === "string" ? req.body.emergencyContactRelationship.trim() : "";
    const emergencyContactDetails = typeof req.body.emergencyContactDetails === "string" ? req.body.emergencyContactDetails.trim() : "";
    const childcareType = req.body.childcareType;
    const careStartTime = typeof req.body.careStartTime === "string" ? req.body.careStartTime : "";
    const careEndTime = typeof req.body.careEndTime === "string" ? req.body.careEndTime : "";
    if (name.length < 2 || name.length > 50) return res.status(400).json({ success: false, message: "Name must be between 2 and 50 characters" });
    if (!/^\+?[\d\s()-]{7,20}$/.test(phone)) return res.status(400).json({ success: false, message: "Enter a valid phone number" });
    if (!address || address.length > 500) return res.status(400).json({ success: false, message: "Enter an address of up to 500 characters" });
    if (!area || area.length > 120) return res.status(400).json({ success: false, message: "Enter an area or city of up to 120 characters" });
    if (!emergencyContactName || emergencyContactName.length > 100) return res.status(400).json({ success: false, message: "Enter the emergency contact name" });
    if (!/^\+?[\d\s()-]{7,30}$/.test(emergencyContactPhone)) return res.status(400).json({ success: false, message: "Enter a valid emergency contact number" });
    if (!emergencyContactRelationship || emergencyContactRelationship.length > 80) return res.status(400).json({ success: false, message: "Enter the emergency contact relationship" });
    if (!emergencyContactDetails || emergencyContactDetails.length > 500) return res.status(400).json({ success: false, message: "Enter emergency contact details of up to 500 characters" });
    if (!["full-time", "part-time"].includes(childcareType)) return res.status(400).json({ success: false, message: "Choose full-time or part-time child care" });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(careStartTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(careEndTime) || careEndTime <= careStartTime) return res.status(400).json({ success: false, message: "Choose a valid daycare start and end time" });
    const user = await req.mainModels.User.findOneAndUpdate(
      { _id: req.user.userId, role: "parent", isActive: true },
      { $set: { name, phone, address, area, emergencyContactName, emergencyContactPhone, emergencyContactRelationship, emergencyContactDetails, childcareType, careStartTime, careEndTime } },
      { new: true, runValidators: true, select: "name email phone profilePhoto role isActive address area emergencyContactName emergencyContactPhone emergencyContactRelationship emergencyContactDetails childcareType careStartTime careEndTime" }
    ).lean();
    if (!user) return res.status(404).json({ success: false, message: "Parent account not found" });
    return res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, profilePhoto: user.profilePhoto, role: user.role, isActive: user.isActive, address: user.address, area: user.area, emergencyContactName: user.emergencyContactName, emergencyContactPhone: user.emergencyContactPhone, emergencyContactRelationship: user.emergencyContactRelationship, emergencyContactDetails: user.emergencyContactDetails, childcareType: user.childcareType, careStartTime: user.careStartTime, careEndTime: user.careEndTime } });
  } catch (error) {
    console.error("Parent profile update failed:", error.message);
    return res.status(503).json({ success: false, message: "Your profile could not be updated right now" });
  }
}

module.exports = { getParentPortal, getParentChildPhoto, createComplaint, createRequest, getParentProfile, updateParentProfile, getParentProfilePhoto, uploadParentProfilePhoto, deleteParentProfilePhoto };
