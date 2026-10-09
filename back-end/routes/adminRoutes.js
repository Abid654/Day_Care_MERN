const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const daycareController = require("../controllers/daycareController");

const router = express.Router();
router.use(authMiddleware, requireRole("admin"));
router.get("/overview", daycareController.getAdminOverview);
router.get("/records/:module", daycareController.listAdminRecords);
router.get("/daycares", daycareController.listAdminDaycares);
router.get("/daycares/:tenantId", daycareController.getAdminDaycare);
router.get("/daycares/:tenantId/users", daycareController.listAdminDaycareUsers);
router.get("/daycares/:tenantId/activity-logs", daycareController.listAdminDaycareActivityLogs);
router.patch("/daycares/:tenantId/user-limit", daycareController.updateAdminDaycareUserLimit);
router.patch("/daycares/:tenantId/users/:userId", daycareController.updateAdminDaycareUser);
router.patch("/daycares/:tenantId/review", daycareController.reviewDaycare);
router.patch("/daycares/:tenantId/status", daycareController.changeAdminDaycareStatus);

module.exports = router;
