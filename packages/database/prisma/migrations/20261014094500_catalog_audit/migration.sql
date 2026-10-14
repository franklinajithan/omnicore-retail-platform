CREATE TABLE "CatalogAudit" (
 "id" UUID NOT NULL,
 "tenantId" UUID NOT NULL,
 "productId" UUID NOT NULL,
 "action" TEXT NOT NULL,
 "actorType" TEXT NOT NULL DEFAULT 'PILOT_SERVICE',
 "before" JSONB,
 "after" JSONB,
 "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CatalogAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatalogAudit_tenantId_productId_occurredAt_idx" ON "CatalogAudit"("tenantId","productId","occurredAt");
ALTER TABLE "CatalogAudit" ADD CONSTRAINT "CatalogAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "CatalogAudit" ADD CONSTRAINT "CatalogAudit_productId_tenantId_fkey" FOREIGN KEY ("productId","tenantId") REFERENCES "Product"("id","tenantId") ON UPDATE CASCADE ON DELETE RESTRICT;
