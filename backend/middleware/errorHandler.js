const { ApiError, formatErrorResponse } = require("../utils/errors");
const { HTTP_STATUS, ERROR_CODES } = require("../config/constants");

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err);

  // Handle Joi validation errors
  if (err.details && err.details.isJoi) {
    const details = err.details.error.details.map((d) => ({
      field: d.path.join("."),
      message: d.message,
    }));
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(formatErrorResponse(err));
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: "Invalid token",
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: "Token expired",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle database errors
  if (err.code === "SQLITE_CONSTRAINT") {
    return res.status(HTTP_STATUS.CONFLICT).json({
      error: {
        code: ERROR_CODES.CONFLICT,
        message: "Duplicate entry or constraint violation",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Generic server error
  return res.status(HTTP_STATUS.SERVER_ERROR).json({
    error: {
      code: ERROR_CODES.SERVER_ERROR,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Async error wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  asyncHandler,
};
