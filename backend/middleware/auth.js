const { verifyAccessToken } = require("../utils/jwt");
const {
  handleAuthError,
  handleForbiddenError,
  ApiError,
} = require("../utils/errors");
const { ROLES, HTTP_STATUS, ERROR_CODES } = require("../config/constants");

/**
 * Verify JWT access token
 */
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw handleAuthError("Access token required");
    }

    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check user role
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw handleAuthError("User not authenticated");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw handleForbiddenError("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user is admin
 */
function isAdmin(req, res, next) {
  return authorize(ROLES.ADMIN)(req, res, next);
}

/**
 * Check if user is client
 */
function isClient(req, res, next) {
  return authorize(ROLES.CLIENT)(req, res, next);
}

/**
 * Check if user owns the resource
 */
function ownsResource(resourceUserId) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw handleAuthError("User not authenticated");
      }

      if (req.user.userId !== resourceUserId && req.user.role !== ROLES.ADMIN) {
        throw handleForbiddenError("You do not own this resource");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticateToken,
  authorize,
  isAdmin,
  isClient,
  ownsResource,
};
