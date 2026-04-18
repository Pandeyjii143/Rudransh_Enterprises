# Database Improvements - Registration Table Enhancement

## Current Users Table Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT,
  role_id INTEGER DEFAULT 2,
  phone TEXT,
  address TEXT,
  google_id TEXT UNIQUE,
  profile_picture TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles (id)
)
```

## Improved Users Table Schema (Recommended)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Security
  hashed_password TEXT,
  google_id TEXT UNIQUE,
  is_email_verified BOOLEAN DEFAULT 0,
  email_verification_token TEXT UNIQUE,
  email_verified_at DATETIME,
  
  -- Address Information
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'India',
  
  -- Profile
  profile_picture TEXT,
  bio TEXT,
  company_name TEXT,
  
  -- Account Status
  role_id INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT 1,
  is_banned BOOLEAN DEFAULT 0,
  ban_reason TEXT,
  
  -- Activity Tracking
  last_login DATETIME,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until DATETIME,
  
  -- Preferences
  newsletter_subscribed BOOLEAN DEFAULT 1,
  two_factor_enabled BOOLEAN DEFAULT 0,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  
  FOREIGN KEY (role_id) REFERENCES roles (id)
)
```

## Migration Steps

### Step 1: Add Missing Columns
```sql
-- Add new columns to existing users table (if needed)
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN full_name TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN zip_code TEXT;
ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'India';
ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verification_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN email_verified_at DATETIME;
ALTER TABLE users ADD COLUMN last_login DATETIME;
ALTER TABLE users ADD COLUMN company_name TEXT;
```

### Step 2: Copy Data from Existing Fields
```sql
-- Populate first_name and last_name from existing name field
UPDATE users 
SET 
  first_name = SUBSTR(name, 1, INSTR(name, ' ') - 1),
  last_name = SUBSTR(name, INSTR(name, ' ') + 1),
  full_name = name
WHERE first_name IS NULL OR first_name = '';
```

### Step 3: Create Indexes for Better Performance
```sql
-- Email index for quick lookups
CREATE INDEX idx_users_email ON users(email);

-- Google ID index
CREATE INDEX idx_users_google_id ON users(google_id);

-- Active users index
CREATE INDEX idx_users_active ON users(is_active);

-- City/location index
CREATE INDEX idx_users_city ON users(city);

-- Verification status index
CREATE INDEX idx_users_verified ON users(is_email_verified);
```

## Benefits of This Schema

1. **Separate Name Fields**: Better for international support and mail merging
2. **Email Verification**: Track which users have verified their email
3. **Address Components**: Separate city, state, zip for better data integrity
4. **Security Tracking**: Failed login attempts, account lockouts
5. **Activity Monitoring**: Track last login, prevent abuse
6. **Soft Deletes**: Delete with timestamp instead of actual deletion
7. **Preferences**: Newsletter and 2FA settings
8. **Performance**: Indexes on frequently queried fields
9. **Audit Trail**: created_at and updated_at timestamps

## SQL Migration Script

```sql
-- Create backup if needed
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- Add new columns
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_email_verified);
```

## Registration Form Requirements

### Required Fields
- ✅ Full Name (or First Name + Last Name)
- ✅ Email Address
- ✅ Password (min 8 chars, uppercase, number)
- ✅ Phone Number

### Optional Fields
- Address
- City
- State
- Zip Code
- Company Name (for B2B users)

### Auto-Generated
- Email Verification Token
- creation timestamp
- last_updated timestamp

## Backend Updates Needed

1. Update register endpoint to handle additional fields
2. Add email verification flow
3. Add password strength validation
4. Add rate limiting for failed login attempts
5. Add audit logging for registration
6. Add data sanitization and validation

## Frontend Validation

1. ✅ Email format validation
2. ✅ Password strength requirements
3. ✅ Confirm password matching
4. ✅ Phone number validation
5. ✅ Required field checking
6. ✅ Real-time error feedback
7. ✅ Terms & conditions acceptance

---

## Current Status
- ✅ Frontend registration form enhanced with all new fields
- ✅ Form validation implemented
- ✅ CSS styling for professional appearance
- ⏳ Backend schema migration recommended
- ⏳ Email verification flow (future feature)
- ⏳ Enhanced security features (future feature)
