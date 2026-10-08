-- Additive migration: existing barcode rows remain UNIT / one retail unit.
ALTER TABLE "ProductBarcode"
  ADD COLUMN "level" TEXT NOT NULL DEFAULT 'UNIT',
  ADD COLUMN "unitsPerScan" DECIMAL(18,3) NOT NULL DEFAULT 1,
  ADD COLUMN "supplierId" UUID;

ALTER TABLE "ProductBarcode"
  ADD CONSTRAINT "ProductBarcode_unitsPerScan_positive" CHECK ("unitsPerScan" > 0),
  ADD CONSTRAINT "ProductBarcode_level_valid" CHECK ("level" IN ('UNIT','INNER','CASE','PALLET')),
  ADD CONSTRAINT "ProductBarcode_unit_one" CHECK ("level" <> 'UNIT' OR "unitsPerScan" = 1);
