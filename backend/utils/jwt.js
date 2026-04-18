const jwt = require("jsonwebtoken");
const { dbAsync } = require("../config/database");
const { TOKEN_TYPES, TOKEN_EXPIRY } = require("../config/constants");

const SECRET_KEY =
  process.env.SECRET_KEY ||
  "a2a295d455b84ed99b0c8ee8fc5a1d0654d44570ab104cca8b992eea1c3b3a1e";
const REFRESH_SECRET =
  process.env.REFRESH_SECRET ||
  "refresh_secret_key_12345678901234567890123456789012345678901234567890";

/**
 * Generate access token (short-lived)
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: TOKEN_TYPES.ACCESS,
    },
    SECRET_KEY,
    { expiresIn: TOKEN_EXPIRY.ACCESS }
  );
}

/**
 * Generate refresh token (long-lived)
 */
function generateRefreshToken(userId) {
  const token = jwt.sign(
    {
      userId,
      type: TOKEN_TYPES.REFRESH,
    },
    REFRESH_SECRET,
    { expiresIn: TOKEN_EXPIRY.REFRESH }
  );
  return token;
}

/**
 * Save refresh token to database
 */
async function saveRefreshToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await dbAsync.run(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt.toISOString()]
  );
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("ACCESS_TOKEN_EXPIRED");
    }
    throw new Error("INVALID_TOKEN");
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }
}

/**
 * Check if refresh token exists in database
 */
async function isRefreshTokenValid(userId, token) {
  const record = await dbAsync.get(
    "SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > datetime('now')",
    [userId, token]
  );
  return !!record;
}

/**
 * Revoke refresh token
 */
async function revokeRefreshToken(token) {
  await dbAsync.run("DELETE FROM refresh_tokens WHERE token = ?", [token]);
}

/**
 * Revoke all refresh tokens for a user
 */
async function revokeAllRefreshTokens(userId) {
  await dbAsync.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  SECRET_KEY,
  REFRESH_SECRET,
};
