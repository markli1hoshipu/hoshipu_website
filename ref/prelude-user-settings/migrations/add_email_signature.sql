-- Add email signature fields to employee_info table
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS email_signature TEXT;
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS signature_logo_url TEXT;
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS signature_font_size INTEGER DEFAULT 12;
ALTER TABLE employee_info ADD COLUMN IF NOT EXISTS signature_logo_height INTEGER DEFAULT 50;

-- Add comments for documentation
COMMENT ON COLUMN employee_info.email_signature IS 'User email signature text, max 500 chars';
COMMENT ON COLUMN employee_info.signature_logo_url IS 'URL to signature logo image';
COMMENT ON COLUMN employee_info.signature_font_size IS 'Font size for signature text (px), 8-20';
COMMENT ON COLUMN employee_info.signature_logo_height IS 'Logo height (px), 30-100';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_info_email_signature ON employee_info(email) WHERE email_signature IS NOT NULL;
