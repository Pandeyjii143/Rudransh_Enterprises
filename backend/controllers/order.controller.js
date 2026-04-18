const { asyncHandler } = require("../middleware/errorHandler");
const {
  OrderService,
  ProductService,
} = require("../services/database.service");
const { dbAsync } = require("../config/database");
const { ApiError } = require("../utils/errors");
const { HTTP_STATUS } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || "sk_test_your_stripe_secret_key_here",
);

/**
 * GET /api/orders
 */
const getOrders = asyncHandler(async (req, res) => {
  let orders;

  if (req.user.role === "admin") {
    orders = await OrderService.findAll();
  } else {
    orders = await OrderService.findByUserId(req.user.userId);
  }

  res.status(HTTP_STATUS.OK).json(orders);
});

/**
 * GET /api/orders/:orderId
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.orderId);

  if (!order) {
    throw new ApiError("Order not found", HTTP_STATUS.NOT_FOUND);
  }

  // Check authorization
  if (req.user.role !== "admin" && order.user_id !== req.user.userId) {
    throw new ApiError("Unauthorized", HTTP_STATUS.FORBIDDEN);
  }

  // Get order items
  const items = await dbAsync.all(
    `SELECT oi.*, p.name, p.image FROM order_items oi
     JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
    [req.params.orderId],
  );

  order.items = items;
  res.status(HTTP_STATUS.OK).json(order);
});

/**
 * POST /api/cart/checkout
 */
const checkout = asyncHandler(async (req, res) => {
  const { items, shippingAddress, phone } = req.body;

  // Calculate total and verify stock
  let totalAmount = 0;

  for (const item of items) {
    const product = await ProductService.findById(item.productId);

    if (!product) {
      throw new ApiError(
        `Product ${item.productId} not found`,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (product.stock < item.quantity) {
      throw new ApiError(
        `Insufficient stock for ${product.name}`,
        HTTP_STATUS.CONFLICT,
      );
    }

    totalAmount += product.price * item.quantity;
  }

  // Create order
  const orderId = uuidv4();
  await OrderService.create({
    id: orderId,
    user_id: req.user.userId,
    total_amount: totalAmount,
    shipping_address: shippingAddress,
    phone,
  });

  // Add order items
  for (const item of items) {
    const product = await ProductService.findById(item.productId);
    await dbAsync.run(
      `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
      [orderId, item.productId, item.quantity, product.price],
    );

    // Update product stock
    await ProductService.update(item.productId, {
      stock: product.stock - item.quantity,
    });
  }

  res.status(HTTP_STATUS.CREATED).json({
    orderId,
    totalAmount,
    status: "pending",
    message: "Order created successfully",
  });
});

/**
 * POST /api/payment/create-intent
 */
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await OrderService.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", HTTP_STATUS.NOT_FOUND);
  }

  // Check authorization
  if (req.user.role !== "admin" && order.user_id !== req.user.userId) {
    throw new ApiError("Unauthorized", HTTP_STATUS.FORBIDDEN);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.total_amount * 100),
    currency: "inr",
    metadata: { orderId },
  });

  // Save payment record
  await dbAsync.run(
    `INSERT INTO payments (id, order_id, stripe_payment_id, amount, currency) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), orderId, paymentIntent.id, order.total_amount, "inr"],
  );

  res.status(HTTP_STATUS.OK).json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
});

/**
 * PUT /api/admin/orders/:orderId/status
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const order = await OrderService.updateStatus(req.params.orderId, status);
  res.status(HTTP_STATUS.OK).json({ message: "Order status updated", order });
});

module.exports = {
  getOrders,
  getOrder,
  checkout,
  createPaymentIntent,
  updateOrderStatus,
};
