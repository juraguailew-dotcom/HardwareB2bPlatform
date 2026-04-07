-- Order features migration
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(30) DEFAULT NULL CHECK (dispute_status IN ('open','resolved','rejected') OR dispute_status IS NULL),
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS partial_fulfilled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS min_order_value DECIMAL(10,2) DEFAULT 0;

-- Address book for contractors
CREATE TABLE IF NOT EXISTS saved_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order drafts
CREATE TABLE IF NOT EXISTS order_drafts (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER,
    shop_name VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]',
    delivery_address TEXT,
    delivery_date DATE,
    delivery_time VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
