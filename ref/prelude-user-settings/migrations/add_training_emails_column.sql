-- Add training emails JSONB column to employee_info
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS training_emails JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN employee_info.training_emails IS 'Array of training email objects: [{"subject": "...", "body": "..."}]';

-- Drop the old user_email_training table since data will be in employee_info
DROP TABLE IF EXISTS user_email_training;

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_employee_info_training_emails ON employee_info USING gin(training_emails);
