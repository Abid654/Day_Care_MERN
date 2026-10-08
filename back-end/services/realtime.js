const authMiddleware = require("../middleware/authMiddleware");

const staffRoom = (tenantId) => `tenant:${tenantId}:staff`;
const parentRoom = (tenantId, parentId) => `tenant:${tenantId}:parent:${parentId}`;

async function emitToActiveParents(io, mainModels, tenantId, payload, filter = {}) {
  const links = await mainModels.ParentTenantLink.find({ tenant: tenantId, isActive: true, ...filter }).select("daycareParent").lean();
  for (const link of links) io.to(parentRoom(tenantId, link.daycareParent)).emit("notification:new", payload);
}

function attachRealtime(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(new Error("Authentication required"));

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return next(new Error(body?.message || "Authentication failed")); },
    };
    authMiddleware(req, res, (error) => {
      if (error) return next(error);
      if (res.statusCode || !req.user) return next(new Error(res.body?.message || "Authentication failed"));
      socket.data.user = req.user;
      socket.data.tenant = req.tenant;
      socket.data.mainModels = req.mainModels;
      socket.data.models = req.models;
      return next();
    });
  });

  io.on("connection", async (socket) => {
    const { user, tenant, mainModels } = socket.data;
    if (user.role === "parent") {
      const links = await mainModels.ParentTenantLink.find({ parentUser: user.userId, isActive: true }).select("tenant daycareParent").lean().catch((error) => {
        console.error("Realtime parent room lookup failed:", error.message);
        return [];
      });
      for (const link of links) {
        const tenantId = String(link.tenant);
        socket.join(parentRoom(tenantId, link.daycareParent));
      }
      return;
    }

    if (tenant && ["daycare", "manager", "caregiver"].includes(user.role)) {
      const tenantId = String(tenant._id);
      socket.join(staffRoom(tenantId));
    }
  });
}

async function publishCenterNotification(req, record) {
  if (!record || record.status !== "sent" || !req.tenant) return;
  const io = req.app.get("io");
  if (!io) return;

  const tenantId = String(req.tenant._id);
  const payload = {
    id: String(record._id),
    tenantId,
    daycareName: req.tenant.name,
    title: record.title,
    message: record.message,
    type: record.type,
    audience: record.audience,
    sentAt: record.sentAt || record.createdAt || new Date(),
  };

  if (record.audience === "all-parents") {
    await emitToActiveParents(io, req.mainModels, req.tenant._id, payload);
  } else if (record.audience === "parent" && record.parent) {
    await emitToActiveParents(io, req.mainModels, req.tenant._id, payload, { daycareParent: record.parent });
  } else if (record.audience === "class" && record.classGroup) {
    const parentIds = await req.models.Child.distinct("parentContact", { classGroup: record.classGroup, status: { $ne: "inactive" }, parentContact: { $ne: null } });
    const links = parentIds.length ? await req.mainModels.ParentTenantLink.find({ tenant: req.tenant._id, daycareParent: { $in: parentIds }, isActive: true }).select("daycareParent").lean() : [];
    for (const link of links) io.to(parentRoom(tenantId, link.daycareParent)).emit("notification:new", payload);
  } else if (record.audience === "staff") {
    io.to(staffRoom(tenantId)).emit("notification:new", payload);
  } else if (record.audience === "all") {
    io.to(staffRoom(tenantId)).emit("notification:new", payload);
    await emitToActiveParents(io, req.mainModels, req.tenant._id, payload);
  }
}

module.exports = { attachRealtime, publishCenterNotification };
