const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const controller = require("../controllers/parentController");

const router = express.Router();
router.use(authMiddleware, requireRole("parent"));
router.get("/portal", controller.getParentPortal);
router.post("/portal/:tenantId/complaints", controller.createComplaint);
router.post("/portal/:tenantId/requests", controller.createRequest);

module.exports = router;
