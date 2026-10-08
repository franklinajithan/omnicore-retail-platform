-- TEAM 06 INTEGRATION CANDIDATE. NOT APPLIED.
-- PostgreSQL migration proposal. Requires shared-schema review and Prisma model sync.
-- Tenant/supplier/order references intentionally not FK-bound until existing key types
-- and tenant-scoped compound key conventions are confirmed by integration owner.
BEGIN;

CREATE TABLE IF NOT EXISTS purchasing_supplier_invoices (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_order_id uuid,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'IMPORTED'
    CHECK (status IN ('IMPORTED','REVIEW_REQUIRED','MATCHED','APPROVED','DISPUTED','SETTLED')),
  source_file_key text,
  source_file_sha256 char(64),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchasing_invoice_supplier_number_unique UNIQUE (tenant_id,supplier_id,invoice_number),
  CONSTRAINT purchasing_invoice_id_tenant_unique UNIQUE (id,tenant_id)
);

CREATE TABLE IF NOT EXISTS purchasing_supplier_invoice_lines (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES purchasing_supplier_invoices(id) ON DELETE RESTRICT,
  line_number integer NOT NULL CHECK (line_number > 0),
  product_id uuid,
  raw_supplier_code text,
  raw_barcode text,
  raw_description text NOT NULL,
  quantity numeric(18,3) NOT NULL CHECK (quantity >= 0),
  unit_cost numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  vat_rate numeric(8,4) NOT NULL CHECK (vat_rate BETWEEN 0 AND 100),
  match_status text NOT NULL DEFAULT 'UNMATCHED'
    CHECK (match_status IN ('MATCHED','UNMATCHED','AMBIGUOUS','CONFLICT')),
  CONSTRAINT purchasing_invoice_line_number_unique UNIQUE (invoice_id,line_number)
);

CREATE TABLE IF NOT EXISTS purchasing_invoice_discrepancies (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  invoice_line_id uuid,
  product_id uuid,
  discrepancy_type text NOT NULL CHECK (discrepancy_type IN
    ('UNINVOICED_RECEIPT','INVOICE_WITHOUT_RECEIPT','QUANTITY','PRICE','VAT','DAMAGED','WRONG_ITEM')),
  expected_value text,
  actual_value text,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','ACCEPTED','DISPUTED','RESOLVED')),
  resolution_note text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchasing_discrepancy_invoice_tenant_fk
    FOREIGN KEY (invoice_id,tenant_id) REFERENCES purchasing_supplier_invoices(id,tenant_id),
  CONSTRAINT purchasing_discrepancy_line_fk
    FOREIGN KEY (invoice_line_id) REFERENCES purchasing_supplier_invoice_lines(id)
);

CREATE TABLE IF NOT EXISTS purchasing_supplier_claims (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  claim_number text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','ACKNOWLEDGED','PARTIALLY_CREDITED','CREDITED','REJECTED','CANCELLED')),
  total_net numeric(18,2) NOT NULL CHECK (total_net >= 0),
  total_vat numeric(18,2) NOT NULL CHECK (total_vat >= 0),
  total_gross numeric(18,2) GENERATED ALWAYS AS (total_net + total_vat) STORED,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchasing_claim_number_unique UNIQUE (tenant_id,claim_number),
  CONSTRAINT purchasing_claim_id_tenant_unique UNIQUE (id,tenant_id),
  CONSTRAINT purchasing_claim_invoice_tenant_fk
    FOREIGN KEY (invoice_id,tenant_id) REFERENCES purchasing_supplier_invoices(id,tenant_id)
);

CREATE TABLE IF NOT EXISTS purchasing_supplier_claim_lines (
  id uuid PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES purchasing_supplier_claims(id) ON DELETE RESTRICT,
  invoice_line_id uuid REFERENCES purchasing_supplier_invoice_lines(id),
  product_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('SHORTAGE','OVERCHARGE','DAMAGED','WRONG_ITEM')),
  quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
  net_amount numeric(18,2) NOT NULL CHECK (net_amount >= 0),
  vat_amount numeric(18,2) NOT NULL CHECK (vat_amount >= 0),
  note text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS purchasing_supplier_claim_events (
  id uuid PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES purchasing_supplier_claims(id) ON DELETE RESTRICT,
  action text NOT NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id text NOT NULL,
  reason text,
  supplier_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchasing_supplier_credit_allocations (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  credit_note_reference text NOT NULL,
  net_amount numeric(18,2) NOT NULL CHECK (net_amount >= 0),
  vat_amount numeric(18,2) NOT NULL CHECK (vat_amount >= 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchasing_credit_positive CHECK (net_amount + vat_amount > 0),
  CONSTRAINT purchasing_credit_claim_tenant_fk
    FOREIGN KEY (claim_id,tenant_id) REFERENCES purchasing_supplier_claims(id,tenant_id),
  CONSTRAINT purchasing_credit_note_unique UNIQUE (tenant_id,claim_id,credit_note_reference)
);

CREATE INDEX IF NOT EXISTS purchasing_invoice_tenant_status_idx
  ON purchasing_supplier_invoices(tenant_id,status,invoice_date DESC);
CREATE INDEX IF NOT EXISTS purchasing_claim_tenant_status_idx
  ON purchasing_supplier_claims(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS purchasing_discrepancy_tenant_status_idx
  ON purchasing_invoice_discrepancies(tenant_id,status);
CREATE INDEX IF NOT EXISTS purchasing_credit_claim_idx
  ON purchasing_supplier_credit_allocations(claim_id);

COMMIT;
