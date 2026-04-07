-- Add attachment support to direct_messages
ALTER TABLE direct_messages
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);

-- Allow empty message when an attachment is present
ALTER TABLE direct_messages ALTER COLUMN message SET DEFAULT '';
