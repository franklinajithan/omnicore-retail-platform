PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,item_code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,english_name TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',vat_rate REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS barcodes(barcode TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),pack_qty REAL NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_barcodes_product ON barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_products_item_code ON products(item_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE TABLE IF NOT EXISTS prices(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),store_id TEXT NOT NULL,retail_price INTEGER NOT NULL,cost_price INTEGER,effective_from TEXT NOT NULL,effective_to TEXT,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_prices_lookup ON prices(store_id,product_id,effective_from);
CREATE TABLE IF NOT EXISTS sales(id TEXT PRIMARY KEY,receipt_no TEXT NOT NULL UNIQUE,store_id TEXT NOT NULL,till_id TEXT NOT NULL,cashier_id TEXT NOT NULL,status TEXT NOT NULL,subtotal INTEGER NOT NULL DEFAULT 0,discount_total INTEGER NOT NULL DEFAULT 0,vat_total INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL,amount_tendered INTEGER NOT NULL DEFAULT 0,change_due INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,sync_status TEXT NOT NULL DEFAULT 'PENDING',sync_attempts INTEGER NOT NULL DEFAULT 0,last_sync_error TEXT);
CREATE INDEX IF NOT EXISTS idx_sales_sync ON sales(sync_status,created_at);
CREATE TABLE IF NOT EXISTS sale_lines(id TEXT PRIMARY KEY,sale_id TEXT NOT NULL REFERENCES sales(id),product_id TEXT NOT NULL,item_code TEXT NOT NULL,barcode TEXT,name TEXT NOT NULL,qty REAL NOT NULL,unit_price INTEGER NOT NULL,discount INTEGER NOT NULL DEFAULT 0,vat_rate REAL NOT NULL,vat_amount INTEGER NOT NULL DEFAULT 0,line_total INTEGER NOT NULL,price_reason TEXT);
CREATE INDEX IF NOT EXISTS idx_sale_lines_sale ON sale_lines(sale_id);
CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,sale_id TEXT NOT NULL REFERENCES sales(id),method TEXT NOT NULL,amount INTEGER NOT NULL,reference TEXT);
CREATE TABLE IF NOT EXISTS sync_state(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS receipt_sequences(store_id TEXT NOT NULL,till_id TEXT NOT NULL,business_date TEXT NOT NULL,last_number INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(store_id,till_id,business_date));
CREATE TABLE IF NOT EXISTS till_sessions(id TEXT PRIMARY KEY,store_id TEXT NOT NULL,till_id TEXT NOT NULL,cashier_id TEXT NOT NULL,status TEXT NOT NULL,opening_float INTEGER NOT NULL DEFAULT 0,opened_at TEXT NOT NULL,closed_at TEXT,closing_cash INTEGER);
CREATE INDEX IF NOT EXISTS idx_till_sessions_open ON till_sessions(store_id,till_id,status);
CREATE TABLE IF NOT EXISTS held_sales(id TEXT PRIMARY KEY,store_id TEXT NOT NULL,till_id TEXT NOT NULL,cashier_id TEXT NOT NULL,label TEXT,lines_json TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_held_sales_till ON held_sales(store_id,till_id,created_at);
CREATE TABLE IF NOT EXISTS sale_returns(id TEXT PRIMARY KEY,original_sale_id TEXT NOT NULL,store_id TEXT NOT NULL,till_id TEXT NOT NULL,cashier_id TEXT NOT NULL,reason TEXT NOT NULL,total INTEGER NOT NULL,created_at TEXT NOT NULL,sync_status TEXT NOT NULL DEFAULT 'PENDING');
CREATE TABLE IF NOT EXISTS sale_return_lines(id TEXT PRIMARY KEY,return_id TEXT NOT NULL REFERENCES sale_returns(id),original_line_id TEXT,product_id TEXT NOT NULL,item_code TEXT NOT NULL,qty REAL NOT NULL,unit_price INTEGER NOT NULL,line_total INTEGER NOT NULL);

-- Centrally approved promotions cached for offline store checkout.
CREATE TABLE IF NOT EXISTS promotion_rules (
 promotion_id TEXT NOT NULL,
 product_id TEXT NOT NULL,
 store_id TEXT NOT NULL,
 scope TEXT NOT NULL,
 type TEXT NOT NULL,
 value REAL NOT NULL,
 required_quantity INTEGER,
 priority INTEGER NOT NULL DEFAULT 0,
 starts_at TEXT NOT NULL,
 ends_at TEXT NOT NULL,
 PRIMARY KEY(promotion_id,product_id,store_id)
);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_store_product ON promotion_rules(store_id,product_id,starts_at,ends_at);
