-- OmniCore Retail Platform - Baseline Schema Migration
-- Generated from schema.prisma
-- This migration creates the complete initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "MovementType" AS ENUM ('RECEIPT', 'SALE', 'WASTAGE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN');
CREATE TYPE "ProductActivityType" AS ENUM (
  'DELIVERY_RECEIVED', 'SALE', 'RTC_SALE', 'RTC_LABEL', 'STOCKTAKE_COUNT',
  'STOCK_ADJUSTMENT', 'WASTAGE', 'STORE_USE', 'TRANSFER_IN', 'TRANSFER_OUT',
  'SUPPLIER_CLAIM_OPENED', 'CLAIM_CREDITED', 'REPORTED_THEFT', 'CONFIRMED_LOSS',
  'PRICE_CHANGED', 'SUPPLIER_COST_CHANGED'
);

-- Tenant table
CREATE TABLE "Tenant" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- TenantUser table  
CREATE TABLE "TenantUser" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantUser_tenantId_userId_key" UNIQUE ("tenantId", "userId")
);

CREATE INDEX "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- Store table
CREATE TABLE "Store" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Store_tenantId_code_key" UNIQUE ("tenantId", "code"),
  CONSTRAINT "Store_id_tenantId_key" UNIQUE ("id", "tenantId")
);

-- Product table
CREATE TABLE "Product" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "itemCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "baseUnit" TEXT NOT NULL DEFAULT 'EACH',
  "imageUrl" TEXT,
  "category" TEXT,
  "vatApplicable" BOOLEAN,
  "caseSize" DECIMAL(18,3),
  "casePrice" DECIMAL(18,4),
  "eachPrice" DECIMAL(18,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_tenantId_itemCode_key" UNIQUE ("tenantId", "itemCode"),
  CONSTRAINT "Product_id_tenantId_key" UNIQUE ("id", "tenantId")
);

-- ProductBarcode table
CREATE TABLE "ProductBarcode" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductBarcode_tenantId_code_key" UNIQUE ("tenantId", "code")
);

CREATE INDEX "ProductBarcode_tenantId_productId_idx" ON "ProductBarcode"("tenantId", "productId");

-- Supplier table
CREATE TABLE "Supplier" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Supplier_tenantId_code_key" UNIQUE ("tenantId", "code"),
  CONSTRAINT "Supplier_id_tenantId_key" UNIQUE ("id", "tenantId")
);

-- SupplierProduct table
CREATE TABLE "SupplierProduct" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "supplierId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "supplierCode" TEXT NOT NULL,
  "packSize" DECIMAL(18,3) NOT NULL,
  "cost" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierProduct_supplierId_supplierCode_key" UNIQUE ("supplierId", "supplierCode"),
  CONSTRAINT "SupplierProduct_supplierId_productId_key" UNIQUE ("supplierId", "productId")
);

-- StockBalance table
CREATE TABLE "StockBalance" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockBalance_tenantId_storeId_productId_key" UNIQUE ("tenantId", "storeId", "productId")
);

-- StockMovement table
CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "type" "MovementType" NOT NULL,
  "quantityDelta" DECIMAL(18,3) NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovement_tenantId_idempotencyKey_key" UNIQUE ("tenantId", "idempotencyKey")
);

CREATE INDEX "StockMovement_tenantId_storeId_productId_createdAt_idx" 
  ON "StockMovement"("tenantId", "storeId", "productId", "createdAt");

-- PurchaseOrder table
CREATE TABLE "PurchaseOrder" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrder_tenantId_number_key" UNIQUE ("tenantId", "number"),
  CONSTRAINT "PurchaseOrder_id_tenantId_key" UNIQUE ("id", "tenantId")
);

-- PurchaseOrderLine table
CREATE TABLE "PurchaseOrderLine" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "orderedQuantity" DECIMAL(18,3) NOT NULL,
  "unitCost" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- GoodsReceipt table
CREATE TABLE "GoodsReceipt" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GoodsReceipt_tenantId_idempotencyKey_key" UNIQUE ("tenantId", "idempotencyKey")
);

-- GoodsReceiptLine table
CREATE TABLE "GoodsReceiptLine" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "receiptId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "receivedQuantity" DECIMAL(18,3) NOT NULL,
  CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- ProductActivity table
CREATE TABLE "ProductActivity" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "type" "ProductActivityType" NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "scannedBarcode" TEXT,
  "categoryIdSnapshot" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "skuSnapshot" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quantityDelta" DECIMAL(18,3) NOT NULL,
  "sourceQuantity" DECIMAL(18,3),
  "sourceUnit" TEXT,
  "unitCost" DECIMAL(18,4),
  "listPrice" DECIMAL(18,4),
  "actualSalePrice" DECIMAL(18,4),
  "currency" VARCHAR(3) NOT NULL,
  "costBasis" TEXT,
  "reason" TEXT,
  "actorId" TEXT,
  "metadata" JSONB,
  CONSTRAINT "ProductActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductActivity_tenantId_sourceModule_sourceEventId_key" 
    UNIQUE ("tenantId", "sourceModule", "sourceEventId")
);

CREATE INDEX "ProductActivity_tenantId_productId_occurredAt_id_idx" 
  ON "ProductActivity"("tenantId", "productId", "occurredAt", "id");
CREATE INDEX "ProductActivity_tenantId_storeId_occurredAt_id_idx" 
  ON "ProductActivity"("tenantId", "storeId", "occurredAt", "id");
CREATE INDEX "ProductActivity_tenantId_scannedBarcode_occurredAt_idx" 
  ON "ProductActivity"("tenantId", "scannedBarcode", "occurredAt");
CREATE INDEX "ProductActivity_tenantId_type_occurredAt_idx" 
  ON "ProductActivity"("tenantId", "type", "occurredAt");

-- ProductAudit table
CREATE TABLE "ProductAudit" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "changes" JSONB NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductAudit_tenantId_productId_createdAt_id_idx" 
  ON "ProductAudit"("tenantId", "productId", "createdAt", "id");

-- ProductPrice table
CREATE TABLE "ProductPrice" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "storeId" UUID,
  "currency" VARCHAR(3) NOT NULL,
  "retail" DECIMAL(18,4) NOT NULL,
  "vatRate" DECIMAL(5,2) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "reason" TEXT,
  CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductPrice_tenantId_productId_storeId_effectiveAt_id_idx" 
  ON "ProductPrice"("tenantId", "productId", "storeId", "effectiveAt", "id");

-- ProductAlias table
CREATE TABLE "ProductAlias" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "itemCode" TEXT NOT NULL,
  "productId" UUID NOT NULL,
  "sourceProductId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductAlias_tenantId_itemCode_key" UNIQUE ("tenantId", "itemCode")
);

CREATE INDEX "ProductAlias_tenantId_productId_idx" ON "ProductAlias"("tenantId", "productId");

-- Foreign Key Constraints

ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Store" ADD CONSTRAINT "Store_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" 
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_storeId_tenantId_fkey" 
  FOREIGN KEY ("storeId", "tenantId") REFERENCES "Store"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storeId_tenantId_fkey" 
  FOREIGN KEY ("storeId", "tenantId") REFERENCES "Store"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_tenantId_fkey" 
  FOREIGN KEY ("supplierId", "tenantId") REFERENCES "Supplier"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_orderId_fkey" 
  FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_orderId_tenantId_fkey" 
  FOREIGN KEY ("orderId", "tenantId") REFERENCES "PurchaseOrder"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_storeId_tenantId_fkey" 
  FOREIGN KEY ("storeId", "tenantId") REFERENCES "Store"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_receiptId_fkey" 
  FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductActivity" ADD CONSTRAINT "ProductActivity_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductActivity" ADD CONSTRAINT "ProductActivity_storeId_tenantId_fkey" 
  FOREIGN KEY ("storeId", "tenantId") REFERENCES "Store"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductActivity" ADD CONSTRAINT "ProductActivity_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAudit" ADD CONSTRAINT "ProductAudit_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAudit" ADD CONSTRAINT "ProductAudit_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_storeId_tenantId_fkey" 
  FOREIGN KEY ("storeId", "tenantId") REFERENCES "Store"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_tenantId_fkey" 
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
