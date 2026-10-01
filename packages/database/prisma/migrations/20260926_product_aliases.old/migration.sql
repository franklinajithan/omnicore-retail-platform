CREATE TABLE "ProductAlias" (
 "id" UUID NOT NULL,
 "tenantId" UUID NOT NULL,
 "itemCode" TEXT NOT NULL,
 "productId" UUID NOT NULL,
 "sourceProductId" UUID,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "actorId" TEXT NOT NULL,
 CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductAlias_tenantId_itemCode_key" ON "ProductAlias"("tenantId","itemCode");
CREATE INDEX "ProductAlias_tenantId_productId_idx" ON "ProductAlias"("tenantId","productId");
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_tenantId_fkey" FOREIGN KEY ("productId","tenantId") REFERENCES "Product"("id","tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
