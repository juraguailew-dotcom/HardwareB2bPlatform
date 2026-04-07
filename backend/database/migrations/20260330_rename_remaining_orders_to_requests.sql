-- Supplemental Refactor: Rename remaining "order" entities to "request"
-- Date: 2026-03-30

-- 1. Rename 'order_drafts' table to 'request_drafts'
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'order_drafts') THEN
        ALTER TABLE order_drafts RENAME TO request_drafts;
    END IF;
END $$;

-- 2. Rename 'order_templates' table to 'request_templates'
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'order_templates') THEN
        ALTER TABLE order_templates RENAME TO request_templates;
    END IF;
END $$;

-- 3. Rename 'order_id' column to 'request_id' in 'disputes' table
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'order_id') THEN
        ALTER TABLE disputes RENAME COLUMN order_id TO request_id;
    END IF;
END $$;

-- 4. Rename 'order_id' column to 'request_id' in 'chat_messages' table
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'order_id') THEN
        ALTER TABLE chat_messages RENAME COLUMN order_id TO request_id;
    END IF;
END $$;

-- 5. Rename sequences for drafts and templates if they exist
ALTER SEQUENCE IF EXISTS order_drafts_id_seq RENAME TO request_drafts_id_seq;
ALTER SEQUENCE IF EXISTS order_templates_id_seq RENAME TO request_templates_id_seq;

-- 6. Update indexes for chat_messages and disputes
ALTER INDEX IF EXISTS idx_chat_order RENAME TO idx_chat_request;
ALTER INDEX IF EXISTS idx_disputes_order RENAME TO idx_disputes_request;
