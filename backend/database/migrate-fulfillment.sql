-- Add fulfillment fields to orders table
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(20) DEFAULT 'delivery' CHECK (fulfillment_type IN ('delivery', 'pickup')),
    ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50);
