-- Project-Wide Refactor: Rename "orders" to "requests"
-- Date: 2026-03-30
-- Notes:
--   - Idempotent migration so environments that already renamed the tables do not fail.
--   - Safe to run when either the legacy or new schema already exists.

-- 1. Rename 'orders' table to 'requests' if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'orders'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'requests'
    ) THEN
        ALTER TABLE orders RENAME TO requests;
    END IF;
END $$;

-- 2. Rename 'order_date' column to 'request_date' in 'requests' table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'order_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'request_date'
    ) THEN
        ALTER TABLE requests RENAME COLUMN order_date TO request_date;
    END IF;
END $$;

-- 3. Rename 'order_items' table to 'request_items' if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'order_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'request_items'
    ) THEN
        ALTER TABLE order_items RENAME TO request_items;
    END IF;
END $$;

-- 4. Rename 'order_id' column to 'request_id' in 'request_items' table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'request_items' AND column_name = 'order_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'request_items' AND column_name = 'request_id'
    ) THEN
        ALTER TABLE request_items RENAME COLUMN order_id TO request_id;
    END IF;
END $$;

-- 5. Rename 'order_id' column to 'request_id' in 'reviews' table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'order_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'request_id'
    ) THEN
        ALTER TABLE reviews RENAME COLUMN order_id TO request_id;
    END IF;
END $$;

-- 6. Rename sequences if they still use legacy names
ALTER SEQUENCE IF EXISTS orders_id_seq RENAME TO requests_id_seq;
ALTER SEQUENCE IF EXISTS order_items_id_seq RENAME TO request_items_id_seq;
