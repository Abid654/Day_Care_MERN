const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const controller = require("../controllers/parentController");

const router = express.Router();
router.use(authMiddleware, requireRole("parent"));
router.get("/profile", controller.getParentProfile);
router.put("/profile", controller.updateParentProfile);
router.post("/profile/photo", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "3mb" }), controller.uploadParentProfilePhoto);
router.get("/profile/photo", controller.getParentProfilePhoto);
router.delete("/profile/photo", controller.deleteParentProfilePhoto);
router.get("/portal", controller.getParentPortal);
router.get("/portal/:tenantId/children/:childId/photo", controller.getParentChildPhoto);
router.post("/portal/:tenantId/complaints", controller.createComplaint);
router.post("/portal/:tenantId/requests", controller.createRequest);

module.exports = router;
