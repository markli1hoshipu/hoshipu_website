-- Seed: Insert initial email template
-- Purpose: Provide a sample "Follow-up Check-in" template for immediate use
-- Database: postgres

INSERT INTO templates (
    id,
    name,
    channel,
    subject,
    body,
    tokens,
    is_active,
    performance_stats,
    description,
    generation_level,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'Follow-up Check-in',
    'email'::template_channel,
    'Quick check-in for [name]',
    'Hi [primary_contact],

Hope all is well at [name]! Just checking in to see how things are going in the [industry] space.

We''re committed to supporting your success and wanted to touch base about any upcoming projects or challenges where we might be able to help.

Would love to hear what you''ve been working on lately.

Regards,',
    '["name", "primary_contact", "industry"]'::jsonb,
    true,
    '{"total_sends": 0, "successful_sends": 0, "failed_sends": 0, "success_rate": 100.0}'::jsonb,
    'General follow-up template for checking in with existing customers',
    0,
    NOW(),
    NOW()
)
ON CONFLICT (name, channel) DO NOTHING;

-- Verify seed
SELECT id, name, channel, is_active, description
FROM templates
WHERE name = 'Follow-up Check-in';
