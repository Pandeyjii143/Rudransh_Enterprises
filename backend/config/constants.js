module.exports = {
  ROLES: {
    ADMIN: "admin",
    CLIENT: "client",
  },
  TOKEN_TYPES: {
    ACCESS: "access",
    REFRESH: "refresh",
  },
  TOKEN_EXPIRY: {
    ACCESS: "15m", // Short-lived access token
    REFRESH: "7d", // Long-lived refresh token
  },
  ERROR_CODES: {
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",
    SERVER_ERROR: "SERVER_ERROR",
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    SERVER_ERROR: 500,
  },
};
