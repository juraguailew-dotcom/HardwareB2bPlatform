-- Add pricing_method column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(50) DEFAULT 'unit';

-- Allowed pricing methods:
--   unit        – price per single piece/item          (Tools, Hardware, Safety, Fasteners, Garden)
--   bulk        – tiered bulk discount                 (Tools, Hardware, Safety, Fasteners)
--   measure     – price per unit of measure (m/sheet)  (Materials, Lumber, Roofing)
--   volume      – price per litre/gallon               (Paint, Adhesives)
--   kit         – price per kit or set                 (Electrical, Plumbing)
--   bundle      – price per bundle                     (Garden)

-- Back-fill sensible defaults for existing products based on their category
UPDATE products SET pricing_method = CASE
    WHEN category IN ('tools', 'hardware', 'safety', 'fasteners') THEN 'bulk'
    WHEN category IN ('materials', 'lumber', 'roofing')           THEN 'measure'
    WHEN category IN ('paint', 'adhesives')                       THEN 'volume'
    WHEN category IN ('electrical', 'plumbing')                   THEN 'kit'
    WHEN category = 'garden'                                      THEN 'bundle'
    ELSE 'unit'
END
WHERE pricing_method = 'unit' OR pricing_method IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_pricing_method ON products(pricing_method);
