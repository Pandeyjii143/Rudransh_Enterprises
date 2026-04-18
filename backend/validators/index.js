const Joi = require("joi");

// Auth validators
const authValidators = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number",
      }),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
      "string.pattern.base": "Phone must be 10 digits",
    }),
    address: Joi.string().max(500).optional().trim(),
  }),

  login: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

// Product validators
const productValidators = {
  create: Joi.object({
    name: Joi.string().min(3).max(200).required().trim(),
    price: Joi.number().positive().required(),
    section_id: Joi.number().integer().positive().required(),
    image: Joi.string().uri().optional(),
    channel: Joi.string().max(50).optional().trim(),
    stock: Joi.number().integer().min(0).default(0),
    description: Joi.string().max(1000).optional().trim(),
    brand: Joi.string().max(100).optional().trim(),
    specifications: Joi.string().max(1000).optional().trim(),
    is_featured: Joi.boolean().default(false),
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(200).optional().trim(),
    price: Joi.number().positive().optional(),
    section_id: Joi.number().integer().positive().optional(),
    image: Joi.string().uri().optional(),
    channel: Joi.string().max(50).optional().trim(),
    stock: Joi.number().integer().min(0).optional(),
    description: Joi.string().max(1000).optional().trim(),
    brand: Joi.string().max(100).optional().trim(),
    specifications: Joi.string().max(1000).optional().trim(),
    is_featured: Joi.boolean().optional(),
    is_active: Joi.boolean().optional(),
  }),
};

// Section validators
const sectionValidators = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    description: Joi.string().max(500).optional().trim(),
    image: Joi.string().uri().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional().trim(),
    description: Joi.string().max(500).optional().trim(),
    image: Joi.string().uri().optional(),
    display_order: Joi.number().integer().optional(),
    is_active: Joi.boolean().optional(),
  }),
};

// Order validators
const orderValidators = {
  checkout: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.number().integer().positive().required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .min(1)
      .required(),
    shippingAddress: Joi.string().min(10).max(500).required().trim(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid("pending", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled")
      .required(),
  }),
};

module.exports = {
  authValidators,
  productValidators,
  sectionValidators,
  orderValidators,
};
