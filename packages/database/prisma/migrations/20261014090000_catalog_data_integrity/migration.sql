-- Fail before applying a tenant barcode uniqueness constraint if existing data conflicts.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM "ProductBarcode" b JOIN "Product" p ON p.id=b."productId"
   GROUP BY p."tenantId", b.code HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Duplicate tenant barcodes found. Resolve duplicates before migration.';
 END IF;
END $$;
ALTER TABLE "ProductBarcode" ADD COLUMN "tenantId" UUID;
UPDATE "ProductBarcode" b SET "tenantId"=p."tenantId" FROM "Product" p WHERE p.id=b."productId";
ALTER TABLE "ProductBarcode" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductBarcode" DROP CONSTRAINT IF EXISTS "ProductBarcode_productId_fkey";
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_tenantId_fkey" FOREIGN KEY ("productId","tenantId") REFERENCES "Product"("id","tenantId") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
DROP INDEX IF EXISTS "ProductBarcode_productId_code_key";
DROP INDEX IF EXISTS "ProductBarcode_code_idx";
CREATE UNIQUE INDEX "ProductBarcode_tenantId_code_key" ON "ProductBarcode" ("tenantId","code");
CREATE INDEX "ProductBarcode_productId_idx" ON "ProductBarcode" ("productId");
CREATE TABLE "SupplierCostHistory" (
 "id" UUID NOT NULL,
 "supplierProductId" UUID NOT NULL,
 "previousCost" DECIMAL(18,4),
 "newCost" DECIMAL(18,4) NOT NULL,
 "previousPackSize" DECIMAL(18,3),
 "newPackSize" DECIMAL(18,3) NOT NULL,
 "reason" TEXT NOT NULL,
 "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupplierCostHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierCostHistory_supplierProductId_changedAt_idx" ON "SupplierCostHistory" ("supplierProductId","changedAt");
ALTER TABLE "SupplierCostHistory" ADD CONSTRAINT "SupplierCostHistory_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
