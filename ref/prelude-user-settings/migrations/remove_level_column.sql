-- Migration: Remove Level Column
-- Date: 2025-01-29
-- Description: Removes the level column from user_profiles table

-- Drop the level column if it exists
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS level;

-- Display results
SELECT
    COUNT(*) as total_users,
    COUNT(username) as users_with_username,
    COUNT(password_hash) as users_with_password,
    SUM(CASE WHEN has_real_email THEN 1 ELSE 0 END) as users_with_real_email
FROM user_profiles;
