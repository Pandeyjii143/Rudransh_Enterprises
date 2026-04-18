const { asyncHandler } = require("../middleware/errorHandler");
const { UserService } = require("../services/database.service");
const authService = require("../services/auth.service");
const { ApiError } = require("../utils/errors");
const { HTTP_STATUS } = require("../config/constants");

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(HTTP_STATUS.CREATED).json(data);
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  console.log(`[AUTH] login request received for email=${req.body.email}`);
  const data = await authService.login(req.body.email, req.body.password);
  res.status(HTTP_STATUS.OK).json(data);
});

/**
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const data = await authService.refreshAccessToken(req.body.refreshToken);
  res.status(HTTP_STATUS.OK).json(data);
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const data = await authService.logout(req.body.refreshToken);
  res.status(HTTP_STATUS.OK).json(data);
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await UserService.findById(req.user.userId);
  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.NOT_FOUND);
  }
  res.status(HTTP_STATUS.OK).json(authService.sanitizeUser(user));
});

/**
 * GET /api/auth/google/callback (redirect after OAuth)
 */
const googleCallback = asyncHandler(async (req, res) => {
  // Passport.js handles the strategy
  const user = req.user;
  const data = await authService.googleAuth(user);

  res.redirect(
    `http://localhost:3000/auth/callback?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}&user=${encodeURIComponent(
      JSON.stringify(data.user),
    )}`,
  );
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  googleCallback,
};
