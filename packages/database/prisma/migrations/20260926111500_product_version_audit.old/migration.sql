ALTER TABLE "Product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "ProductAudit" (
  "id" UUID NOT NULL,
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
  ON "ProductAudit"("tenantId","productId","createdAt","id");
ALTER TABLE "ProductAudit" ADD CONSTRAINT "ProductAudit_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAudit" ADD CONSTRAINT "ProductAudit_productId_tenantId_fkey"
  FOREIGN KEY ("productId","tenantId") REFERENCES "Product"("id","tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
