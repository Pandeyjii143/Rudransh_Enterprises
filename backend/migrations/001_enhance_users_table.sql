-- Database Migration: Enhanced Registration Table
-- This migration adds new fields to the users table for improved data collection
-- Run this SQL script against your SQLite database

-- Step 1: Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT 0;

-- Step 2: Populate name fields from existing data (if name field exists)
-- This assumes the 'name' field contains "<FirstName> <LastName>" format
UPDATE users 
SET 
  full_name = COALESCE(full_name, name),
  first_name = COALESCE(first_name, SUBSTR(name, 1, INSTR(name || ' ', ' ') - 1)),
  last_name = COALESCE(last_name, SUBSTR(name, INSTR(name || ' ', ' ') + 1))
WHERE (first_name IS NULL OR first_name = '') 
  AND name IS NOT NULL 
  AND name != '';

-- Step 3: Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_email_verified);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned);

-- Step 4: Create audit logging table (optional)
CREATE TABLE IF NOT EXISTS user_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Step 5: Create email verification tokens table (optional)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Step 6: Create refresh token blacklist for logout (optional)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Create index for refresh tokens
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user_id ON revoked_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token);

-- Step 7: Create index for email verification tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Step 8: View to get active unverified users (useful for admin dashboard)
CREATE VIEW IF NOT EXISTS active_unverified_users AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  phone,
  created_at,
  CASE 
    WHEN email_verification_token IS NOT NULL THEN 'Pending Verification'
    ELSE 'Not Sent'
  END as verification_status
FROM users
WHERE is_active = 1 
  AND is_email_verified = 0
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Step 9: View to get recently registered users
CREATE VIEW IF NOT EXISTS recent_registrations AS
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  city,
  country,
  created_at,
  is_email_verified,
  is_active
FROM users
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Verify migration
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as verified_users FROM users WHERE is_email_verified = 1;
SELECT COUNT(*) as unverified_users FROM users WHERE is_email_verified = 0;
