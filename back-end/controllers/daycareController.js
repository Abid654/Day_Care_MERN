const { getMainModels, getTenantConnection, getTenantModels } = require("../config/db");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");

const PROFILE_FIELDS = [
  "daycareName", "description", "address", "area", "phone", "qualifications", "training",
  "experienceYears", "services", "facilities", "cctv", "nursingFacilities", "nursingStaffCount",
  "medicalStaffCount", "images", "fee", "paymentOptions",
];

async function listDaycares(req, res) {
  try {
    const tenants = await getMainModels().Tenant.find({ status: "active", listingStatus: "approved" })
      .select("name ownerUserId databaseName createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const results = await Promise.allSettled(tenants.map(async (tenant) => {
      const models = getTenantModels(getTenantConnection(tenant.databaseName));
      const [user, profile] = await Promise.all([
        models.User.findOne({ _id: tenant.ownerUserId, role: "daycare", isActive: true }).select("name phone").lean(),
        models.DaycareProfile.findOne({ user: tenant.ownerUserId, approvalStatus: "approved", isVerified: true }).select("daycareName description address area phone services fee paymentOptions images isVerified").lean(),
      ]);
      if (!user) return null;
      return {
        id: tenant._id,
        name: profile?.daycareName || tenant.name || user.name,
        contactName: user.name,
        phone: profile?.phone || user.phone,
        description: profile?.description || "This daycare has recently joined. Contact them to learn more about their care services.",
        area: profile?.area || profile?.address || "Location details coming soon",
        services: profile?.services || [],
        fee: profile?.fee ?? null,
        paymentOptions: profile?.paymentOptions || [],
        images: profile?.images || [],
        isVerified: profile?.isVerified || false,
        profileComplete: Boolean(profile),
      };
    }));

    const daycares = results
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => result.value);
    for (const result of results) {
      if (result.status === "rejected") console.error("Daycare listing entry unavailable:", result.reason.message);
    }
    return res.json({ success: true, daycares });
  } catch (error) {
    console.error("Daycare listing error:", error.message);
    return res.status(503).json({ success: false, message: "Daycare listings are temporarily unavailable" });
  }
}

async function getPublicDaycare(req, res) {
  try {
    const { tenantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(404).json({ success: false, message: "Daycare listing not found" });
    }
    const tenant = await getMainModels().Tenant.findOne({
      _id: tenantId,
      status: "active",
      listingStatus: "approved",
    }).select("name ownerUserId databaseName").lean();
    if (!tenant) return res.status(404).json({ success: false, message: "Daycare listing not found" });

    const models = getTenantModels(getTenantConnection(tenant.databaseName));
    const [user, profile] = await Promise.all([
      models.User.findOne({ _id: tenant.ownerUserId, role: "daycare", isActive: true }).select("name phone").lean(),
      models.DaycareProfile.findOne({
        user: tenant.ownerUserId,
        approvalStatus: "approved",
        isVerified: true,
      }).select("daycareName description address area phone qualifications training experienceYears services facilities cctv nursingFacilities nursingStaffCount medicalStaffCount images fee paymentOptions isVerified").lean(),
    ]);
    if (!user || !profile) return res.status(404).json({ success: false, message: "Daycare listing not found" });

    return res.json({
      success: true,
      daycare: {
        id: tenant._id,
        name: profile.daycareName || tenant.name || user.name,
        contactName: user.name,
        phone: profile.phone || user.phone,
        profile,
      },
    });
  } catch (error) {
    console.error("Public daycare profile error:", error.message);
    return res.status(503).json({ success: false, message: "Daycare profile is temporarily unavailable" });
  }
}

async function getMyProfile(req, res) {
  try {
    const profile = await req.models.DaycareProfile.findOne({ user: req.user.userId }).lean();
    return res.json({ success: true, profile, listingStatus: req.tenant.listingStatus || "pending" });
  } catch (error) {
    console.error("Daycare profile read error:", error.message);
    return res.status(503).json({ success: false, message: "Profile is temporarily unavailable" });
  }
}

async function saveMyProfile(req, res) {
  try {
    const profileFields = Object.fromEntries(PROFILE_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
      .map((field) => [field, req.body[field]]));
    profileFields.user = req.user.userId;
    profileFields.approvalStatus = "pending";
    profileFields.isVerified = false;

    const profile = await req.models.DaycareProfile.findOneAndUpdate(
      { user: req.user.userId },
      { $set: profileFields },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await req.mainModels.Tenant.updateOne(
      { _id: req.tenant._id, status: "active" },
      { $set: { listingStatus: "pending" }, $unset: { reviewedAt: 1, reviewedBy: 1 } },
    );
    return res.json({ success: true, message: "Profile submitted for admin review", profile, listingStatus: "pending" });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Please complete all required daycare profile details", errors: Object.values(error.errors).map((item) => item.message) });
    }
    console.error("Daycare profile save error:", error.message);
    return res.status(503).json({ success: false, message: "Profile could not be saved right now" });
  }
}

async function uploadProfilePhoto(req, res) {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ success: false, message: "Select a photo to upload" });
    }
    const contentType = req.headers["content-type"];
    const formats = {
      "image/jpeg": { extension: ".jpg", valid: (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
      "image/png": { extension: ".png", valid: (data) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
      "image/webp": { extension: ".webp", valid: (data) => data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" },
    };
    const format = formats[contentType];
    if (!format || !format.valid(req.body)) return res.status(400).json({ success: false, message: "Only valid JPG, PNG, and WebP images are supported" });

    const directory = path.join(__dirname, "..", "uploads", "daycare", req.tenant._id.toString());
    await fs.mkdir(directory, { recursive: true });
    const existingFiles = await fs.readdir(directory);
    if (existingFiles.length >= 10) return res.status(400).json({ success: false, message: "A maximum of 10 daycare photos can be uploaded" });

    const filename = `${randomUUID()}${format.extension}`;
    await fs.writeFile(path.join(directory, filename), req.body, { flag: "wx" });
    return res.status(201).json({ success: true, url: `/uploads/daycare/${req.tenant._id}/${filename}` });
  } catch (error) {
    console.error("Daycare photo upload error:", error.message);
    return res.status(503).json({ success: false, message: "Photo could not be uploaded right now" });
  }
}

async function listAdminDaycares(req, res) {
  try {
    const tenants = await req.mainModels.Tenant.find({ status: { $in: ["active", "suspended", "inactive"] } })
      .select("name ownerEmail ownerUserId databaseName status listingStatus reviewedAt reviewedBy rejectionReason adminRemarks statusHistory createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const results = await Promise.allSettled(tenants.map(async (tenant) => {
      const models = getTenantModels(getTenantConnection(tenant.databaseName));
      const [user, profile] = await Promise.all([
        models.User.findOne({ _id: tenant.ownerUserId, role: "daycare" }).select("name email phone isActive createdAt").lean(),
        models.DaycareProfile.findOne({ user: tenant.ownerUserId }).lean(),
      ]);
      return {
        id: tenant._id,
        name: profile?.daycareName || tenant.name || user?.name || "Daycare",
        ownerEmail: user?.email || tenant.ownerEmail,
        contactName: user?.name || tenant.name,
        phone: profile?.phone || user?.phone || "",
        isActive: Boolean(user?.isActive),
        tenantStatus: tenant.status,
        listingStatus: tenant.listingStatus || "pending",
        registrationDate: tenant.createdAt,
        reviewedAt: tenant.reviewedAt,
        rejectionReason: tenant.rejectionReason || "",
        adminRemarks: tenant.adminRemarks || "",
        statusHistory: tenant.statusHistory || [],
        profileComplete: Boolean(profile),
        profile: profile ? {
          daycareName: profile.daycareName,
          description: profile.description,
          address: profile.address,
          area: profile.area,
          phone: profile.phone,
          qualifications: profile.qualifications || [],
          training: profile.training || [],
          experienceYears: profile.experienceYears,
          services: profile.services || [],
          facilities: profile.facilities || [],
          cctv: profile.cctv,
          nursingFacilities: profile.nursingFacilities,
          nursingStaffCount: profile.nursingStaffCount,
          medicalStaffCount: profile.medicalStaffCount,
          fee: profile.fee,
          paymentOptions: profile.paymentOptions || [],
          images: profile.images || [],
          approvalStatus: profile.approvalStatus,
          isVerified: profile.isVerified,
        } : null,
      };
    }));
    const daycares = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    for (const result of results) if (result.status === "rejected") console.error("Admin review entry unavailable:", result.reason.message);
    return res.json({ success: true, daycares });
  } catch (error) {
    console.error("Admin daycare review list error:", error.message);
    return res.status(503).json({ success: false, message: "Daycare review list is temporarily unavailable" });
  }
}

async function getAdminOverview(req, res) {
  try {
    const main = req.mainModels;
    const [tenants, totalParents] = await Promise.all([
      main.Tenant.find({ status: { $in: ["active", "suspended", "inactive"] } }).select("name databaseName status listingStatus createdAt").sort({ createdAt: -1 }).lean(),
      main.User.countDocuments({ role: "parent" }),
    ]);
    const totals = { children: 0, activeChildren: 0, inactiveChildren: 0, bookings: 0, pendingBookings: 0, acceptedBookings: 0, completedBookings: 0, cancelledBookings: 0, rejectedBookings: 0, payments: 0, paidPayments: 0, pendingPayments: 0, failedPayments: 0, refundedPayments: 0, revenue: 0, pendingComplaints: 0, inProgressComplaints: 0, resolvedComplaints: 0, rejectedComplaints: 0, reviews: 0, ratingSum: 0, ratingCount: 0 };
    const recentActivity = [];
    const tenantResults = await Promise.allSettled(tenants.map(async (tenant) => {
      const models = getTenantModels(getTenantConnection(tenant.databaseName));
      const [children, activeChildren, bookings, payments, revenue, complaints, reviews, audit] = await Promise.all([
        models.Child.countDocuments({}),
        models.Child.countDocuments({ status: "active" }),
        models.Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        models.Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]),
        models.Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
        models.Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        models.Review.aggregate([{ $group: { _id: null, count: { $sum: 1 }, rating: { $sum: "$rating" } } }]),
        models.AuditLog.find({}).sort({ createdAt: -1 }).limit(5).select("user action module record metadata ipAddress createdAt").populate("user", "name email role").lean(),
      ]);
      return { tenant, children, activeChildren, bookings, payments, revenue: revenue[0]?.amount || 0, complaints, reviews: reviews[0] || { count: 0, rating: 0 }, audit };
    }));
    for (const result of tenantResults) {
      if (result.status !== "fulfilled") { console.error("Platform overview tenant aggregation failed:", result.reason.message); continue; }
      const item = result.value;
      totals.children += item.children;
      totals.activeChildren += item.activeChildren;
      totals.inactiveChildren += Math.max(0, item.children - item.activeChildren);
      totals.bookings += item.bookings.reduce((sum, row) => sum + row.count, 0);
      for (const row of item.bookings) {
        if (row._id === "pending") totals.pendingBookings += row.count;
        if (row._id === "accepted") totals.acceptedBookings += row.count;
        if (row._id === "completed") totals.completedBookings += row.count;
        if (row._id === "cancelled") totals.cancelledBookings += row.count;
        if (row._id === "rejected") totals.rejectedBookings += row.count;
      }
      totals.payments += item.payments.reduce((sum, row) => sum + row.count, 0);
      for (const row of item.payments) {
        if (row._id === "paid") totals.paidPayments += row.count;
        if (row._id === "pending") totals.pendingPayments += row.count;
        if (row._id === "failed") totals.failedPayments += row.count;
        if (row._id === "refunded") totals.refundedPayments += row.count;
      }
      totals.revenue += item.revenue;
      for (const row of item.complaints) {
        if (row._id === "pending") totals.pendingComplaints += row.count;
        if (row._id === "in-progress") totals.inProgressComplaints += row.count;
        if (row._id === "resolved") totals.resolvedComplaints += row.count;
        if (row._id === "rejected") totals.rejectedComplaints += row.count;
      }
      totals.reviews += item.reviews.count;
      totals.ratingSum += item.reviews.rating;
      totals.ratingCount += item.reviews.count;
      for (const log of item.audit) recentActivity.push({ tenant: item.tenant.name, user: log.user?.name || "System", role: log.user?.role || "unknown", action: log.action, module: log.module, record: log.record, metadata: log.metadata, createdAt: log.createdAt });
    }
    const averageRating = totals.ratingCount ? Math.round((totals.ratingSum / totals.ratingCount) * 10) / 10 : null;
    return res.json({ success: true, overview: {
      daycares: { total: tenants.length, pending: tenants.filter((item) => item.listingStatus === "pending").length, approved: tenants.filter((item) => item.listingStatus === "approved").length, rejected: tenants.filter((item) => item.listingStatus === "rejected").length, suspended: tenants.filter((item) => item.status === "suspended").length, inactive: tenants.filter((item) => item.status === "inactive").length },
      parents: totalParents, children: { total: totals.children, active: totals.activeChildren, inactive: totals.inactiveChildren },
      bookings: { total: totals.bookings, pending: totals.pendingBookings, accepted: totals.acceptedBookings, completed: totals.completedBookings, cancelled: totals.cancelledBookings, rejected: totals.rejectedBookings },
      payments: { total: totals.payments, paid: totals.paidPayments, pending: totals.pendingPayments, failed: totals.failedPayments, refunded: totals.refundedPayments, revenue: totals.revenue },
      complaints: { pending: totals.pendingComplaints, inProgress: totals.inProgressComplaints, resolved: totals.resolvedComplaints, rejected: totals.rejectedComplaints },
      reviews: { total: totals.reviews, averageRating },
      registrationTrend: tenants.slice(0, 30).reverse().map((item) => ({ date: item.createdAt, label: item.name, status: item.status === "suspended" ? "suspended" : item.listingStatus })),
      recentActivity: recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12),
    } });
  } catch (error) {
    console.error("Platform overview failed:", error.message);
    return res.status(503).json({ success: false, message: "Platform overview is temporarily unavailable" });
  }
}

async function listAdminRecords(req, res) {
  const allowedModules = ["parents", "children", "bookings", "payments", "complaints", "reviews", "activity-logs", "users"];
  const moduleName = req.params.module;
  if (!allowedModules.includes(moduleName)) return res.status(404).json({ success: false, message: "Platform module not found" });
  try {
    const main = req.mainModels;
    const tenants = await main.Tenant.find({ status: { $in: ["active", "suspended", "inactive"] } }).select("_id name ownerUserId databaseName status listingStatus createdAt").lean();
    const tenantNameById = new Map(tenants.map((tenant) => [String(tenant._id), tenant.name]));
    const parentUsers = await main.User.find({ role: "parent" }).select("_id name email phone isActive createdAt").lean();
    const parentById = new Map(parentUsers.map((parent) => [String(parent._id), parent]));
    let rows = [];

    if (moduleName === "parents") {
      const links = await main.ParentTenantLink.find({ isActive: true }).select("tenant parentUser daycareParent").lean();
      const linked = new Map();
      for (const tenant of tenants) {
        const tenantLinks = links.filter((link) => String(link.tenant) === String(tenant._id) && link.parentUser);
        if (!tenantLinks.length) continue;
        const models = getTenantModels(getTenantConnection(tenant.databaseName));
        const parentRecords = await models.DaycareParent.find({ _id: { $in: tenantLinks.map((link) => link.daycareParent) } }).select("name status").lean();
        const parentRecordById = new Map(parentRecords.map((record) => [String(record._id), record]));
        const childCounts = await models.Child.aggregate([{ $match: { parentContact: { $in: tenantLinks.map((link) => link.daycareParent) } } }, { $group: { _id: "$parentContact", count: { $sum: 1 } } }]);
        const countByParent = new Map(childCounts.map((item) => [String(item._id), item.count]));
        for (const link of tenantLinks) {
          const parent = parentById.get(String(link.parentUser));
          if (!parent) continue;
          const item = linked.get(String(parent._id)) || { ...parent, childrenCount: 0, daycares: [] };
          const record = parentRecordById.get(String(link.daycareParent));
          item.childrenCount += countByParent.get(String(link.daycareParent)) || 0;
          item.daycares.push({ id: tenant._id, name: tenant.name, parentName: record?.name || "Family", status: tenant.status });
          linked.set(String(parent._id), item);
        }
      }
      rows = [...linked.values()];
    } else if (moduleName === "users") {
      rows = parentUsers.map((user) => ({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: "parent", isActive: user.isActive, createdAt: user.createdAt }));
      for (const tenant of tenants) {
        const models = getTenantModels(getTenantConnection(tenant.databaseName));
        const [owner, memberships] = await Promise.all([
          models.User.findOne({ _id: tenant.ownerUserId, role: "daycare" }).select("_id name email phone isActive createdAt").lean(),
          main.TenantMembership.find({ tenant: tenant._id }).select("user email role isActive createdAt").lean(),
        ]);
        if (owner) rows.push({ id: owner._id, name: owner.name, email: owner.email, phone: owner.phone, role: "daycare", isActive: owner.isActive, createdAt: owner.createdAt, daycare: tenant.name });
        const membershipsUsers = await models.User.find({ _id: { $in: memberships.map((membership) => membership.user) } }).select("_id name phone isActive createdAt").lean();
        const accounts = new Map(membershipsUsers.map((account) => [String(account._id), account]));
        for (const membership of memberships) {
          const account = accounts.get(String(membership.user));
          rows.push({ id: membership.user, name: account?.name || membership.email, email: membership.email, phone: account?.phone || "", role: membership.role, isActive: membership.isActive && account?.isActive, createdAt: account?.createdAt || membership.createdAt, daycare: tenant.name });
        }
      }
    } else {
      const settled = await Promise.allSettled(tenants.map(async (tenant) => {
        const models = getTenantModels(getTenantConnection(tenant.databaseName));
        const links = await main.ParentTenantLink.find({ tenant: tenant._id }).select("parentUser daycareParent").lean();
        const parentIdByDaycareParent = new Map(links.map((link) => [String(link.daycareParent), link.parentUser ? String(link.parentUser) : ""]));
        let records = [];
        if (moduleName === "children") {
          records = await models.Child.find({}).select("name dateOfBirth gender enrollmentDate status classGroup parentContact").populate("classGroup", "name").sort({ createdAt: -1 }).lean();
          return records.map((child) => ({ id: child._id, name: child.name, dateOfBirth: child.dateOfBirth, gender: child.gender, enrollmentDate: child.enrollmentDate, status: child.status, className: child.classGroup?.name || "", parentId: parentIdByDaycareParent.get(String(child.parentContact)) || "", parentName: parentById.get(parentIdByDaycareParent.get(String(child.parentContact)))?.name || "", daycareId: tenant._id, daycare: tenant.name }));
        }
        if (moduleName === "bookings") {
          records = await models.Booking.find({}).select("parent child startDate endDate supportType status createdAt").populate("child", "name").sort({ createdAt: -1 }).lean();
          return records.map((item) => ({ id: item._id, parentId: item.parent, parent: parentById.get(String(item.parent))?.name || "Parent", childId: item.child?._id, child: item.child?.name || "", date: item.startDate, endDate: item.endDate, serviceType: item.supportType, status: item.status, createdAt: item.createdAt, daycareId: tenant._id, daycare: tenant.name }));
        }
        if (moduleName === "payments") {
          records = await models.Payment.find({}).select("parent booking amount paymentMethod status transactionId paidAt createdAt").populate({ path: "booking", select: "child", populate: { path: "child", select: "name" } }).sort({ createdAt: -1 }).lean();
          return records.map((item) => ({ id: item._id, transactionId: item.transactionId || String(item._id), parentId: item.parent, parent: parentById.get(String(item.parent))?.name || "Parent", childId: item.booking?.child?._id, child: item.booking?.child?.name || "", amount: item.amount, method: item.paymentMethod, status: item.status, date: item.paidAt || item.createdAt, daycareId: tenant._id, daycare: tenant.name }));
        }
        if (moduleName === "complaints") {
          records = await models.Complaint.find({}).select("complaintNumber parent child subject description priority status response createdAt updatedAt").populate("parent", "name parentUser").populate("child", "name").sort({ createdAt: -1 }).lean();
          return records.map((item) => ({ id: item._id, complaintNumber: item.complaintNumber, parentId: parentIdByDaycareParent.get(String(item.parent?._id)) || String(item.parent?.parentUser || ""), parent: parentById.get(parentIdByDaycareParent.get(String(item.parent?._id)) || String(item.parent?.parentUser || ""))?.name || item.parent?.name || "Parent", childId: item.child?._id, child: item.child?.name || "", subject: item.subject, description: item.description, priority: item.priority, status: item.status, response: item.response, createdAt: item.createdAt, daycareId: tenant._id, daycare: tenant.name }));
        }
        if (moduleName === "reviews") {
          records = await models.Review.find({}).select("reviewer daycare child rating comment reviewType createdAt").populate("child", "name").sort({ createdAt: -1 }).lean();
          const reviewers = await main.User.find({ _id: { $in: records.map((item) => item.reviewer) } }).select("_id name email").lean();
          const reviewerById = new Map(reviewers.map((item) => [String(item._id), item]));
          return records.map((item) => ({ id: item._id, parentId: item.reviewer, parent: reviewerById.get(String(item.reviewer))?.name || "Parent", daycareOwnerId: item.daycare, childId: item.child?._id, child: item.child?.name || "", rating: item.rating, comment: item.comment, reviewType: item.reviewType, createdAt: item.createdAt, daycareId: tenant._id, daycare: tenant.name }));
        }
        if (moduleName === "activity-logs") {
          records = await models.AuditLog.find({}).sort({ createdAt: -1 }).limit(250).select("user action module record metadata ipAddress createdAt").populate("user", "name email role").lean();
          return records.map((item) => ({ id: item._id, user: item.user?.name || "System", email: item.user?.email || "", role: item.user?.role || "unknown", action: item.action, module: item.module, record: item.record, metadata: item.metadata, ipAddress: item.ipAddress || "", createdAt: item.createdAt, daycare: tenant.name }));
        }
        return [];
      }));
      for (const result of settled) {
        if (result.status === "fulfilled") rows.push(...result.value);
        else console.error(`Platform ${moduleName} tenant records unavailable:`, result.reason.message);
      }
    }

    const search = String(req.query.search || "").trim().toLowerCase();
    const status = String(req.query.status || "all");
    const daycareFilter = String(req.query.daycare || "");
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    rows = rows.filter((item) => {
      const haystack = Object.values(item).filter((value) => typeof value === "string" || typeof value === "number").join(" ").toLowerCase();
      const date = new Date(item.createdAt || item.date || 0);
      const itemStatus = item.status ?? (item.isActive === false ? "inactive" : "active");
      const belongsToDaycare = String(item.daycareId || "") === daycareFilter || (item.daycares || []).some((daycare) => String(daycare.id || "") === daycareFilter);
      return (!search || haystack.includes(search)) && (status === "all" || String(itemStatus) === status) && (!daycareFilter || belongsToDaycare) && (!from || date >= from) && (!to || date <= new Date(to.getTime() + 86400000));
    });
    rows.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const total = rows.length;
    return res.json({ success: true, records: rows.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, pages: Math.ceil(total / limit) }, daycares: tenants.map((tenant) => ({ id: tenant._id, name: tenant.name })) });
  } catch (error) {
    console.error(`Platform ${moduleName} listing failed:`, error.message);
    return res.status(503).json({ success: false, message: "Platform records could not be loaded" });
  }
}

async function getAdminDaycare(req, res) {
  try {
    const { tenantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(404).json({ success: false, message: "Daycare registration not found" });
    }
    const tenant = await getMainModels().Tenant.findOne({ _id: tenantId, status: { $in: ["active", "suspended", "inactive"] } })
      .select("name ownerEmail ownerUserId databaseName status listingStatus reviewedAt rejectionReason adminRemarks statusHistory createdAt")
      .lean();
    if (!tenant) return res.status(404).json({ success: false, message: "Daycare registration not found" });

    const models = getTenantModels(getTenantConnection(tenant.databaseName));
    const [user, profile] = await Promise.all([
      models.User.findOne({ _id: tenant.ownerUserId, role: "daycare" }).select("name email phone isActive").lean(),
      models.DaycareProfile.findOne({ user: tenant.ownerUserId }).lean(),
    ]);
    return res.json({
      success: true,
      daycare: {
        id: tenant._id,
        name: profile?.daycareName || tenant.name || user?.name || "Daycare",
        ownerEmail: user?.email || tenant.ownerEmail,
        contactName: user?.name || tenant.name,
        phone: profile?.phone || user?.phone || "",
        isActive: Boolean(user?.isActive),
        tenantStatus: tenant.status,
        listingStatus: tenant.listingStatus || "pending",
        registrationDate: tenant.createdAt,
        reviewedAt: tenant.reviewedAt,
        rejectionReason: tenant.rejectionReason || "",
        adminRemarks: tenant.adminRemarks || "",
        statusHistory: tenant.statusHistory || [],
        profileComplete: Boolean(profile),
        profile: profile ? {
          ...profile,
          qualifications: profile.qualifications || [],
          training: profile.training || [],
          services: profile.services || [],
          facilities: profile.facilities || [],
          paymentOptions: profile.paymentOptions || [],
          images: profile.images || [],
        } : null,
      },
    });
  } catch (error) {
    console.error("Admin daycare profile error:", error.message);
    return res.status(503).json({ success: false, message: "Daycare profile is temporarily unavailable" });
  }
}

async function reviewDaycare(req, res) {
  try {
    const { tenantId } = req.params;
    const decision = req.body.decision;
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 2000) : "";
    if (!mongoose.Types.ObjectId.isValid(tenantId) || !["approved", "rejected", "needs-info"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Invalid daycare review request" });
    }
    if (["rejected", "needs-info"].includes(decision) && !reason) return res.status(400).json({ success: false, message: "A reason or information request is required" });
    const tenant = await req.mainModels.Tenant.findOne({ _id: tenantId, status: "active" });
    if (!tenant) return res.status(404).json({ success: false, message: "Daycare registration not found" });

    const models = getTenantModels(getTenantConnection(tenant.databaseName));
    const profile = await models.DaycareProfile.findOne({ user: tenant.ownerUserId });
    if (decision === "approved" && !profile) {
      return res.status(409).json({ success: false, message: "Daycare must submit its profile before it can be approved" });
    }
    if (profile) {
      profile.approvalStatus = decision;
      profile.isVerified = decision === "approved";
      await profile.save();
    }
    tenant.listingStatus = decision;
    tenant.reviewedAt = new Date();
    tenant.reviewedBy = req.user.userId;
    tenant.rejectionReason = decision === "rejected" ? reason : "";
    tenant.adminRemarks = decision === "needs-info" ? reason : "";
    tenant.statusHistory.push({ status: decision, reason, changedBy: req.user.userId, changedAt: new Date() });
    await tenant.save();
    const messages = { approved: "Daycare approved and listed for parents", rejected: "Daycare application rejected", "needs-info": "More information requested from daycare" };
    return res.json({ success: true, message: messages[decision], listingStatus: tenant.listingStatus, rejectionReason: tenant.rejectionReason, adminRemarks: tenant.adminRemarks });
  } catch (error) {
    console.error("Daycare review update error:", error.message);
    return res.status(503).json({ success: false, message: "Daycare review could not be saved" });
  }
}

async function changeAdminDaycareStatus(req, res) {
  try {
    const { tenantId } = req.params;
    const { action } = req.body || {};
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 2000) : "";
    const validActions = ["suspend", "reactivate", "deactivate", "activate"];
    if (!mongoose.Types.ObjectId.isValid(tenantId) || !validActions.includes(action)) return res.status(400).json({ success: false, message: "Invalid daycare status action" });
    if (["suspend", "deactivate"].includes(action) && !reason) return res.status(400).json({ success: false, message: "A reason is required for this action" });
    const tenant = await req.mainModels.Tenant.findOne({ _id: tenantId, status: { $in: ["active", "suspended", "inactive"] } });
    if (!tenant) return res.status(404).json({ success: false, message: "Daycare registration not found" });
    const timestamp = new Date();
    const tenantStatuses = { suspend: "suspended", reactivate: "active", deactivate: "inactive", activate: "active" };
    tenant.status = tenantStatuses[action];
    const models = getTenantModels(getTenantConnection(tenant.databaseName));
    await models.User.updateMany({}, { $inc: { tokenVersion: 1 } });
    tenant.statusHistory.push({ status: action, reason, changedBy: req.user.userId, changedAt: timestamp });
    await tenant.save();
    const messages = { suspend: "Daycare suspended", reactivate: "Daycare reactivated", deactivate: "Daycare deactivated", activate: "Daycare activated" };
    return res.json({ success: true, tenantStatus: tenant.status, statusHistory: tenant.statusHistory, message: messages[action] });
  } catch (error) {
    console.error("Admin daycare status update failed:", error.message);
    return res.status(503).json({ success: false, message: "Daycare status could not be updated" });
  }
}

module.exports = { listDaycares, getPublicDaycare, getMyProfile, saveMyProfile, uploadProfilePhoto, listAdminDaycares, getAdminOverview, listAdminRecords, getAdminDaycare, reviewDaycare, changeAdminDaycareStatus };
