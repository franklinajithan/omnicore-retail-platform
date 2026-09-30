CREATE TABLE "ProductPrice" (
 "id" UUID NOT NULL,
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
 ON "ProductPrice"("tenantId","productId","storeId","effectiveAt","id");
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_tenantId_fkey"
 FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_tenantId_fkey"
 FOREIGN KEY ("productId","tenantId") REFERENCES "Product"("id","tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_storeId_tenantId_fkey"
 FOREIGN KEY ("storeId","tenantId") REFERENCES "Store"("id","tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
