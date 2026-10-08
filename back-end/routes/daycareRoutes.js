const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireTenant = require("../middleware/requireTenant");
const requireRole = require("../middleware/requireRole");
const daycareController = require("../controllers/daycareController");
const managementRoutes = require("./daycareManagementRoutes");

const router = express.Router();
router.use(authMiddleware, requireTenant);
router.use("/management", managementRoutes);
router.use(requireRole("daycare"));
router.get("/profile", daycareController.getMyProfile);
router.put("/profile", daycareController.saveMyProfile);
router.post("/profile/photos", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "3mb" }), daycareController.uploadProfilePhoto);

module.exports = router;
