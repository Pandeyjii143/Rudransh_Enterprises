const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { productValidators } = require("../validators");
const productController = require("../controllers/product.controller");
const { ROLES } = require("../config/constants");

// Get all products (public)
router.get("/", productController.getProducts);

// Get single product (public)
router.get("/:id", productController.getProduct);

// Create product (admin only)
router.post(
  "/",
  authenticateToken,
  authorize(ROLES.ADMIN),
  validate(productValidators.create),
  productController.createProduct,
);

// Update product (admin only)
router.put(
  "/:id",
  authenticateToken,
  authorize(ROLES.ADMIN),
  validate(productValidators.update),
  productController.updateProduct,
);

// Delete product (admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorize(ROLES.ADMIN),
  productController.deleteProduct,
);

module.exports = router;
