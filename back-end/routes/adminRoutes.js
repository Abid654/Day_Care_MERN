const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const daycareController = require("../controllers/daycareController");

const router = express.Router();
router.use(authMiddleware, requireRole("admin"));
router.get("/daycares", daycareController.listAdminDaycares);
router.get("/daycares/:tenantId", daycareController.getAdminDaycare);
router.patch("/daycares/:tenantId/review", daycareController.reviewDaycare);

module.exports = router;
