const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { orderValidators } = require("../validators");
const orderController = require("../controllers/order.controller");
const { ROLES } = require("../config/constants");

// Get all orders (admin gets all, user gets own)
router.get("/", authenticateToken, orderController.getOrders);

// Get single order
router.get("/:orderId", authenticateToken, orderController.getOrder);

// Checkout
router.post(
  "/checkout",
  authenticateToken,
  validate(orderValidators.checkout),
  orderController.checkout
);

// Create payment intent
router.post(
  "/payment/create-intent",
  authenticateToken,
  validate(orderValidators.refreshToken),
  orderController.createPaymentIntent
);

// Update order status (admin only)
router.put(
  "/:orderId/status",
  authenticateToken,
  authorize(ROLES.ADMIN),
  validate(orderValidators.updateStatus),
  orderController.updateOrderStatus
);

module.exports = router;
