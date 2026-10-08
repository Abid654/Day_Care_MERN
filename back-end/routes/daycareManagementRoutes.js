const express = require("express");
const controller = require("../controllers/daycareManagementController");
const requireManagementPermission = require("../middleware/requireManagementPermission");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.get("/overview", requireManagementPermission("read"), controller.getOverview);
router.get("/settings", requireManagementPermission("read"), controller.getSettings);
router.put("/settings", requireManagementPermission("update"), controller.saveSettings);
router.put("/security/password", controller.changePassword);
router.get("/users", requireRole("daycare"), controller.listUsers);
router.post("/users", requireRole("daycare"), controller.createUser);
router.put("/users/:userId", requireRole("daycare"), controller.updateUser);
router.post("/logout", requireManagementPermission("read"), controller.logLogout);
router.post("/documents/files", requireManagementPermission("create"), express.raw({ type: ["application/pdf", "image/jpeg", "image/png", "image/webp"], limit: "10mb" }), controller.uploadDocument);
router.get("/documents/:recordId/file", requireManagementPermission("read"), controller.downloadDocument);
router.get("/:module", requireManagementPermission("read"), controller.listRecords);
router.post("/:module", requireManagementPermission("create"), controller.createRecord);
router.put("/:module/:recordId", requireManagementPermission("update"), controller.updateRecord);
router.delete("/:module/:recordId", requireManagementPermission("delete"), controller.deleteRecord);

module.exports = router;
