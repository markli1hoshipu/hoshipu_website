-- Migration: Add Password Authentication Support
-- Date: 2025-01-XX
-- Description: Adds username, password_hash, and has_real_email columns to user_profiles

-- Add new columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS has_real_email BOOLEAN DEFAULT FALSE;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Update existing OAuth users to mark they have real emails
-- Set username to email for now (we'll allow users to change it later)
UPDATE user_profiles
SET has_real_email = TRUE,
    username = COALESCE(username, email)  -- Use email if username is not set
WHERE username IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.username IS 'Unique username for password-based login. Auto-generated from email for OAuth users.';
COMMENT ON COLUMN user_profiles.password_hash IS 'Bcrypt hashed password. NULL for OAuth-only users.';
COMMENT ON COLUMN user_profiles.has_real_email IS 'TRUE if email is real (not system-generated). FALSE for username-only accounts.';

-- Display results
SELECT
    COUNT(*) as total_users,
    COUNT(username) as users_with_username,
    COUNT(password_hash) as users_with_password,
    SUM(CASE WHEN has_real_email THEN 1 ELSE 0 END) as users_with_real_email
FROM user_profiles;
