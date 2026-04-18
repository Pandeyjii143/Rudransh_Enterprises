const { HTTP_STATUS, ERROR_CODES } = require("../config/constants");

/**
 * Custom error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || ERROR_CODES.SERVER_ERROR;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Handle validation errors
 */
function handleValidationError(details) {
  return new ApiError(
    details || "Validation failed",
    HTTP_STATUS.BAD_REQUEST,
    ERROR_CODES.VALIDATION_ERROR
  );
}

/**
 * Handle authentication errors
 */
function handleAuthError(message = "Unauthorized") {
  return new ApiError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
}

/**
 * Handle authorization errors
 */
function handleForbiddenError(message = "Forbidden") {
  return new ApiError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
}

/**
 * Handle not found errors
 */
function handleNotFoundError(message = "Resource not found") {
  return new ApiError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
}

/**
 * Format error response
 */
function formatErrorResponse(error) {
  return {
    error: {
      code: error.errorCode || ERROR_CODES.SERVER_ERROR,
      message: error.message,
      timestamp: error.timestamp,
    },
  };
}

module.exports = {
  ApiError,
  handleValidationError,
  handleAuthError,
  handleForbiddenError,
  handleNotFoundError,
  formatErrorResponse,
};
