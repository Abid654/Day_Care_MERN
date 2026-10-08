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
    const tenants = await req.mainModels.Tenant.find({ status: "active" })
      .select("name ownerEmail ownerUserId databaseName listingStatus reviewedAt createdAt")
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
        listingStatus: tenant.listingStatus || "pending",
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

async function getAdminDaycare(req, res) {
  try {
    const { tenantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(404).json({ success: false, message: "Daycare registration not found" });
    }
    const tenant = await getMainModels().Tenant.findOne({ _id: tenantId, status: "active" })
      .select("name ownerEmail ownerUserId databaseName listingStatus")
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
        listingStatus: tenant.listingStatus || "pending",
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
    if (!mongoose.Types.ObjectId.isValid(tenantId) || !["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Invalid daycare review request" });
    }
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
    await tenant.save();
    return res.json({ success: true, message: decision === "approved" ? "Daycare approved and listed for parents" : "Daycare rejected and hidden from parents", listingStatus: tenant.listingStatus });
  } catch (error) {
    console.error("Daycare review update error:", error.message);
    return res.status(503).json({ success: false, message: "Daycare review could not be saved" });
  }
}

module.exports = { listDaycares, getPublicDaycare, getMyProfile, saveMyProfile, uploadProfilePhoto, listAdminDaycares, getAdminDaycare, reviewDaycare };
