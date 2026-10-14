CREATE TABLE "ProductPackComponent" ("id" UUID NOT NULL,"parentPackId" UUID NOT NULL,"childPackId" UUID NOT NULL,"quantity" DECIMAL(18,3) NOT NULL,CONSTRAINT "ProductPackComponent_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ProductPackComponent_parentPackId_childPackId_key" ON "ProductPackComponent"("parentPackId","childPackId");
ALTER TABLE "ProductPack" ADD CONSTRAINT "ProductPack_barcodeId_fkey" FOREIGN KEY ("barcodeId") REFERENCES "ProductBarcode"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "ProductPackComponent" ADD CONSTRAINT "ProductPackComponent_parentPackId_fkey" FOREIGN KEY ("parentPackId") REFERENCES "ProductPack"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "ProductPackComponent" ADD CONSTRAINT "ProductPackComponent_childPackId_fkey" FOREIGN KEY ("childPackId") REFERENCES "ProductPack"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
