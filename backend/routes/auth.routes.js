const express = require("express");
const router = express.Router();
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const { authenticateToken } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { authValidators } = require("../validators");
const authController = require("../controllers/auth.controller");

// Rate limiter for auth endpoints (not for OAuth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    error: { message: "Too many login attempts, please try again later" },
  },
});

// Google OAuth routes (NO rate limiting)
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  authController.googleCallback,
);

// Auth endpoints (WITH rate limiting)
router.post(
  "/register",
  authLimiter,
  validate(authValidators.register),
  authController.register,
);

router.post(
  "/login",
  authLimiter,
  validate(authValidators.login),
  authController.login,
);

// Other auth endpoints (no rate limiting needed)
router.post(
  "/refresh",
  validate(authValidators.refreshToken),
  authController.refreshToken,
);

router.post("/logout", authenticateToken, authController.logout);

router.get("/me", authenticateToken, authController.getMe);

module.exports = router;
