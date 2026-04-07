-- migrate-notification-prefs.sql
-- Adds per-user notification preference columns (email & SMS opt-in, default true)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS notify_sms   BOOLEAN DEFAULT true;
