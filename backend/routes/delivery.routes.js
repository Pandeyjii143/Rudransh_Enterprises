const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/delivery.controller");
const { authenticateToken, authorize } = require("../middleware/auth");
const { ROLES } = require("../config/constants");

// Get tracking info (user)
router.get("/tracking/:orderId", authenticateToken, deliveryController.getTracking);

// Admin: Update delivery status
router.post(
  "/admin/delivery/:orderId/status",
  authenticateToken,
  authorize(ROLES.ADMIN),
  deliveryController.updateDeliveryStatus
);

// Admin: Get all deliveries
router.get(
  "/admin/deliveries",
  authenticateToken,
  authorize(ROLES.ADMIN),
  deliveryController.getAllDeliveries
);

module.exports = router;