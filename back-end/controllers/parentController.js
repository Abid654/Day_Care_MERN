const { getTenantConnection, getTenantModels } = require("../config/db");
const path = require("path");

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

module.exports = { getParentPortal, getParentChildPhoto, createComplaint, createRequest };
