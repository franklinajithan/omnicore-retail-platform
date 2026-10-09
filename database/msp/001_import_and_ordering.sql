-- MSP ordering import foundation. Apply within the tenant-scoped OmniCore database.
-- Store identifiers are text to preserve leading zeros from MSP.
CREATE SCHEMA IF NOT EXISTS msp;
CREATE TABLE IF NOT EXISTS msp.import_batch (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 store_code text NOT NULL,
 report_type text NOT NULL CHECK (report_type IN ('sales','wastage','rtc','delivery','book_stock')),
 report_date date NOT NULL,
 source_filename text NOT NULL,
 sha256 text NOT NULL,
 status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
 row_count integer NOT NULL DEFAULT 0,
 error_message text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE (tenant_id, store_code, report_type, report_date, sha256)
);
CREATE INDEX IF NOT EXISTS msp_batch_store_date ON msp.import_batch(tenant_id,store_code,report_date);
CREATE TABLE IF NOT EXISTS msp.product_identity (
 tenant_id uuid NOT NULL,
 item_code text NOT NULL,
 description text,
 supplier_code text,
 case_size numeric(18,3),
 PRIMARY KEY (tenant_id,item_code)
);
CREATE TABLE IF NOT EXISTS msp.product_barcode (
 tenant_id uuid NOT NULL,
 barcode text NOT NULL,
 item_code text NOT NULL,
 PRIMARY KEY (tenant_id,barcode),
 FOREIGN KEY (tenant_id,item_code) REFERENCES msp.product_identity(tenant_id,item_code)
);
CREATE TABLE IF NOT EXISTS msp.daily_movement (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id uuid NOT NULL REFERENCES msp.import_batch(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 store_code text NOT NULL,
 business_date date NOT NULL,
 item_code text NOT NULL,
 movement_type text NOT NULL CHECK (movement_type IN ('sales','wastage','rtc')),
 quantity numeric(18,3) NOT NULL,
 net_value numeric(18,4),
 source_row integer NOT NULL,
 UNIQUE (batch_id,source_row,movement_type)
);
CREATE INDEX IF NOT EXISTS msp_movement_lookup ON msp.daily_movement(tenant_id,store_code,item_code,business_date);
CREATE TABLE IF NOT EXISTS msp.delivery_line (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL,
 store_code text NOT NULL,
 supplier_code text,
 external_delivery_id text NOT NULL,
 external_line_id text NOT NULL,
 item_code text NOT NULL,
 ordered_qty numeric(18,3) NOT NULL DEFAULT 0,
 received_qty numeric(18,3) NOT NULL DEFAULT 0,
 posted_qty numeric(18,3) NOT NULL DEFAULT 0,
 expected_date date,
 received_at timestamptz,
 posted_at timestamptz,
 status text NOT NULL CHECK (status IN ('ordered','part_received','received_unposted','posted','cancelled')),
 updated_batch_id uuid REFERENCES msp.import_batch(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id,store_code,external_delivery_id,external_line_id)
);
CREATE INDEX IF NOT EXISTS msp_delivery_lookup ON msp.delivery_line(tenant_id,store_code,item_code,status);
CREATE TABLE IF NOT EXISTS msp.book_stock_snapshot (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id uuid NOT NULL REFERENCES msp.import_batch(id),
 tenant_id uuid NOT NULL,
 store_code text NOT NULL,
 captured_at timestamptz NOT NULL,
 item_code text NOT NULL,
 quantity numeric(18,3) NOT NULL,
 UNIQUE (batch_id,item_code)
);
CREATE INDEX IF NOT EXISTS msp_stock_latest ON msp.book_stock_snapshot(tenant_id,store_code,captured_at DESC);
CREATE TABLE IF NOT EXISTS msp.order_run (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 store_code text NOT NULL,
 generated_at timestamptz NOT NULL DEFAULT now(),
 coverage_start date NOT NULL,
 coverage_end date NOT NULL,
 stock_batch_id uuid NOT NULL REFERENCES msp.import_batch(id),
 status text NOT NULL DEFAULT 'draft',
 UNIQUE(id,tenant_id,store_code)
);
CREATE TABLE IF NOT EXISTS msp.order_suggestion (
 order_run_id uuid NOT NULL REFERENCES msp.order_run(id) ON DELETE CASCADE,
 item_code text NOT NULL,
 demand_qty numeric(18,3) NOT NULL,
 book_stock_qty numeric(18,3) NOT NULL,
 unposted_qty numeric(18,3) NOT NULL,
 incoming_qty numeric(18,3) NOT NULL,
 net_required_qty numeric(18,3) NOT NULL,
 case_size numeric(18,3) NOT NULL,
 suggested_cases integer NOT NULL,
 PRIMARY KEY (order_run_id,item_code)
);
-- Delete obsolete book stock only after a newer, validated completed batch exists
-- AND retain snapshots referenced by order runs.
CREATE OR REPLACE FUNCTION msp.prune_book_stock() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE deleted_count integer;
BEGIN
 DELETE FROM msp.book_stock_snapshot old
 WHERE old.captured_at < now() - interval '1 day'
   AND NOT EXISTS (SELECT 1 FROM msp.order_run r WHERE r.stock_batch_id=old.batch_id)
   AND EXISTS (
     SELECT 1 FROM msp.book_stock_snapshot newer
     JOIN msp.import_batch b ON b.id=newer.batch_id AND b.status='completed'
     WHERE newer.tenant_id=old.tenant_id AND newer.store_code=old.store_code
       AND newer.captured_at>old.captured_at
   );
 GET DIAGNOSTICS deleted_count = ROW_COUNT;
 RETURN deleted_count;
END $$;
-- IMPORTANT: Application must set tenant context and enforce tenant-scoped access.
-- Do not expose these tables through unrestricted public APIs.
