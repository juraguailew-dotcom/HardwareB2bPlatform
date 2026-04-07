-- Compatibility Layer: preserve legacy "orders" access after migrating to "requests"
-- Phase: Expand / Transition
-- Purpose:
--   1. Ensure legacy SQL readers can still SELECT from an `orders` relation
--   2. Provide legacy `order_id` aliases where practical through compatibility views
-- Notes:
--   - This migration is intentionally additive and non-destructive.
--   - Writes should move to `requests` / `request_id`.
--   - Final contract cleanup can drop these views once all consumers migrate.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'requests'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'orders'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name = 'orders'
    ) THEN
        EXECUTE '
            CREATE VIEW orders AS
            SELECT
                id,
                contractor_id,
                shop_id,
                request_date AS order_date,
                status,
                total_amount,
                delivery_address,
                delivery_date,
                notes,
                delivery_time,
                delivery_fee,
                requires_approval,
                approved_by,
                approved_at,
                approval_notes,
                expires_at,
                cancelled_by,
                cancelled_at,
                dispute_reason,
                dispute_status,
                disputed_at,
                partial_fulfilled,
                tracking_number,
                tracking_notes,
                dispatched_at,
                delivered_at,
                fulfillment_type,
                payment_status,
                payment_intent_id,
                location_id
            FROM requests
        ';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'request_items'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name = 'order_items'
    ) THEN
        EXECUTE '
            CREATE VIEW order_items AS
            SELECT
                id,
                request_id AS order_id,
                product_id,
                quantity,
                unit_price,
                subtotal
            FROM request_items
        ';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'reviews'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'reviews'
          AND column_name = 'request_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name = 'reviews_legacy_order_ids'
    ) THEN
        EXECUTE '
            CREATE VIEW reviews_legacy_order_ids AS
            SELECT
                id,
                from_user_id,
                to_user_id,
                request_id AS order_id,
                rating,
                comment,
                created_at
            FROM reviews
        ';
    END IF;
END $$;

COMMENT ON VIEW orders IS 'Legacy compatibility view. Deprecated: use requests.';
COMMENT ON VIEW order_items IS 'Legacy compatibility view. Deprecated: use request_items.';
COMMENT ON VIEW reviews_legacy_order_ids IS 'Legacy compatibility view exposing order_id alias. Deprecated: use reviews.request_id.';
