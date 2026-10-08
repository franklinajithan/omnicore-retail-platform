CREATE TABLE "CatalogueChange" (
"id" UUID NOT NULL,
"tenantId" UUID NOT NULL,
"productId" UUID NOT NULL,
"actorId" TEXT NOT NULL,
"action" TEXT NOT NULL,
"before" JSONB,
"after" JSONB NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "CatalogueChange_pkey" PRIMARY KEY ("id"),
CONSTRAINT "CatalogueChange_productId_tenantId_fkey" FOREIGN KEY ("productId","tenantId") REFERENCES "Product"("id","tenantId")
);
CREATE INDEX "CatalogueChange_tenantId_productId_createdAt_idx" ON "CatalogueChange"("tenantId","productId","createdAt");
