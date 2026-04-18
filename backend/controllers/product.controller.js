const { asyncHandler } = require("../middleware/errorHandler");
const { ProductService } = require("../services/database.service");
const { ApiError } = require("../utils/errors");
const { HTTP_STATUS } = require("../config/constants");

/**
 * GET /api/products
 */
const getProducts = asyncHandler(async (req, res) => {
  const filters = {
    section: req.query.section,
    search: req.query.search,
    featured: req.query.featured === "true",
    brandFilter: req.query.brand,
    minPrice: req.query.min_price ? parseFloat(req.query.min_price) : null,
    maxPrice: req.query.max_price ? parseFloat(req.query.max_price) : null,
    limit: req.query.limit ? parseInt(req.query.limit) : 50,
    offset: req.query.offset ? parseInt(req.query.offset) : 0,
  };

  const products = await ProductService.findAll(filters);
  res.status(HTTP_STATUS.OK).json(products);
});

/**
 * GET /api/products/:id
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.findById(req.params.id);
  if (!product) {
    throw new ApiError("Product not found", HTTP_STATUS.NOT_FOUND);
  }
  res.status(HTTP_STATUS.OK).json(product);
});

/**
 * POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body);
  res.status(HTTP_STATUS.CREATED).json(product);
});

/**
 * PUT /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.findById(req.params.id);
  if (!product) {
    throw new ApiError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  const updated = await ProductService.update(req.params.id, req.body);
  res.status(HTTP_STATUS.OK).json(updated);
});

/**
 * DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.findById(req.params.id);
  if (!product) {
    throw new ApiError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  await ProductService.delete(req.params.id);
  res.status(HTTP_STATUS.OK).json({ message: "Product deleted successfully" });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
