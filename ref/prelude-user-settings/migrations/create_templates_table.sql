-- Migration: Create templates table for email template system
-- Purpose: Replace AI-powered email generation with template-based system
-- Database: postgres

-- Create ENUM type for template channel
DO $$ BEGIN
    CREATE TYPE template_channel AS ENUM ('email', 'sms', 'chat');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    channel template_channel NOT NULL DEFAULT 'email',
    subject TEXT,
    body TEXT,
    tokens JSONB,                                 -- ['name', 'primary_contact', ...]
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,            -- Soft delete flag
    performance_stats JSONB,                      -- Cached aggregates
    created_by UUID,                              -- employee_info.employee_id
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,

    -- Future fields (keep for future use):
    version INTEGER DEFAULT 1,
    parent_template_id UUID,
    generation_level INTEGER DEFAULT 0,
    template_type TEXT DEFAULT 'base',

    -- Constraints
    UNIQUE (name, channel)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_channel ON templates(channel);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_is_archived ON templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Add foreign key constraint to employee_info (optional, depends on DB structure)
-- ALTER TABLE templates ADD CONSTRAINT fk_templates_created_by
-- FOREIGN KEY (created_by) REFERENCES employee_info(employee_id) ON DELETE SET NULL;

COMMENT ON TABLE templates IS 'Email template system - NO AI generation, templates only';
COMMENT ON COLUMN templates.tokens IS 'Valid tokens: name, primary_contact, industry, email, phone';
COMMENT ON COLUMN templates.is_archived IS 'Soft delete flag - archived templates are hidden from active lists';
COMMENT ON COLUMN templates.performance_stats IS 'Cached aggregate statistics: total_sends, successful_sends, failed_sends, success_rate, last_used_at';
