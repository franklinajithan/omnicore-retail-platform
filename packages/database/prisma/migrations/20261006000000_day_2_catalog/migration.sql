-- CreateEnum for Day 2
CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE');
CREATE TYPE "IdentifierType" AS ENUM ('EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'GTIN_14', 'ITF_14', 'CODE_128', 'INTERNAL', 'CUSTOM');
CREATE TYPE "PackagingLevel" AS ENUM ('CONSUMER_UNIT', 'INNER_PACK', 'CASE', 'PALLET');
CREATE TYPE "ManufacturerStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable Manufacturer
CREATE TABLE "Manufacturer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "status" "ManufacturerStatus" NOT NULL DEFAULT 'ACTIVE',
    "countryCode" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable Brand
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "manufacturerId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable Category
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "parentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable TaxRate
CREATE TABLE "TaxRate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'GB',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductTranslation
CREATE TABLE "ProductTranslation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductAlias
CREATE TABLE "ProductAlias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductPrice
CREATE TABLE "ProductPrice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "retailPrice" DECIMAL(18,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "changedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupplierCostHistory
CREATE TABLE "SupplierCostHistory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierProductId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "unitCost" DECIMAL(18,4) NOT NULL,
    "caseCost" DECIMAL(18,4) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'GBP',
    "source" TEXT,
    "changedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierCostHistory_pkey" PRIMARY KEY ("id")
);

-- AlterTable Product - Add new columns
ALTER TABLE "Product" RENAME COLUMN "sku" TO "itemCode";

ALTER TABLE "Product" ADD COLUMN "shortName" TEXT;
ALTER TABLE "Product" ADD COLUMN "description" TEXT;
ALTER TABLE "Product" ADD COLUMN "brandId" UUID;
ALTER TABLE "Product" ADD COLUMN "manufacturerId" UUID;
ALTER TABLE "Product" ADD COLUMN "categoryId" UUID;
ALTER TABLE "Product" ADD COLUMN "taxRateId" UUID;
ALTER TABLE "Product" ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'GOODS';
ALTER TABLE "Product" ADD COLUMN "netWeight" DECIMAL(10,3);
ALTER TABLE "Product" ADD COLUMN "grossWeight" DECIMAL(10,3);
ALTER TABLE "Product" ADD COLUMN "weightUnit" TEXT;
ALTER TABLE "Product" ADD COLUMN "volume" DECIMAL(10,3);
ALTER TABLE "Product" ADD COLUMN "volumeUnit" TEXT;
ALTER TABLE "Product" ADD COLUMN "defaultCaseSize" INTEGER;
ALTER TABLE "Product" ADD COLUMN "countryOfOrigin" TEXT;
ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "notes" TEXT;
ALTER TABLE "Product" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Product" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "mergedIntoId" UUID;

-- AlterTable ProductBarcode - Add new columns
ALTER TABLE "ProductBarcode" ADD COLUMN "tenantId" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE "ProductBarcode" ADD COLUMN "identifierType" "IdentifierType" NOT NULL DEFAULT 'EAN_13';
ALTER TABLE "ProductBarcode" ADD COLUMN "packagingLevel" "PackagingLevel" NOT NULL DEFAULT 'CONSUMER_UNIT';
ALTER TABLE "ProductBarcode" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductBarcode" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProductBarcode" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Supplier - Add new columns
ALTER TABLE "Supplier" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Supplier" ADD COLUMN "vatNumber" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "companyNumber" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "orderEmail" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "claimsEmail" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "phone" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "website" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "city" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "state" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "postcode" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "country" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'GBP';
ALTER TABLE "Supplier" ADD COLUMN "paymentTerms" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "minimumOrder" DECIMAL(18,4);
ALTER TABLE "Supplier" ADD COLUMN "deliveryNotes" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Supplier" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable SupplierProduct - Add new columns and rename
ALTER TABLE "SupplierProduct" ADD COLUMN "tenantId" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE "SupplierProduct" RENAME COLUMN "supplierCode" TO "supplierProductCode";
ALTER TABLE "SupplierProduct" RENAME COLUMN "packSize" TO "caseSize";
ALTER TABLE "SupplierProduct" RENAME COLUMN "cost" TO "currentUnitCost";
ALTER TABLE "SupplierProduct" ADD COLUMN "supplierDescription" TEXT;
ALTER TABLE "SupplierProduct" ADD COLUMN "supplierBarcode" TEXT;
ALTER TABLE "SupplierProduct" ADD COLUMN "minimumOrderQty" DECIMAL(18,3);
ALTER TABLE "SupplierProduct" ADD COLUMN "orderMultiple" DECIMAL(18,3);
ALTER TABLE "SupplierProduct" ADD COLUMN "leadTimeDays" INTEGER;
ALTER TABLE "SupplierProduct" ADD COLUMN "currentCaseCost" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "SupplierProduct" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'GBP';
ALTER TABLE "SupplierProduct" ADD COLUMN "isPreferredSupplier" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SupplierProduct" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SupplierProduct" ADD COLUMN "lastCostChangeAt" TIMESTAMP(3);
ALTER TABLE "SupplierProduct" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_tenantId_code_key" ON "Manufacturer"("tenantId", "code");
CREATE INDEX "Manufacturer_tenantId_status_idx" ON "Manufacturer"("tenantId", "status");

CREATE UNIQUE INDEX "Brand_tenantId_code_key" ON "Brand"("tenantId", "code");
CREATE INDEX "Brand_tenantId_manufacturerId_idx" ON "Brand"("tenantId", "manufacturerId");

CREATE UNIQUE INDEX "Category_tenantId_code_key" ON "Category"("tenantId", "code");
CREATE INDEX "Category_tenantId_parentId_idx" ON "Category"("tenantId", "parentId");

CREATE UNIQUE INDEX "TaxRate_tenantId_code_key" ON "TaxRate"("tenantId", "code");
CREATE INDEX "TaxRate_tenantId_isActive_idx" ON "TaxRate"("tenantId", "isActive");

CREATE UNIQUE INDEX "ProductBarcode_tenantId_code_key" ON "ProductBarcode"("tenantId", "code");
CREATE INDEX "ProductBarcode_tenantId_productId_idx" ON "ProductBarcode"("tenantId", "productId");

CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");
CREATE INDEX "ProductTranslation_tenantId_productId_idx" ON "ProductTranslation"("tenantId", "productId");

CREATE INDEX "ProductAlias_tenantId_productId_idx" ON "ProductAlias"("tenantId", "productId");
CREATE INDEX "ProductAlias_tenantId_alias_idx" ON "ProductAlias"("tenantId", "alias");

CREATE UNIQUE INDEX "ProductPrice_tenantId_storeId_productId_effectiveFrom_key" ON "ProductPrice"("tenantId", "storeId", "productId", "effectiveFrom");
CREATE INDEX "ProductPrice_tenantId_storeId_productId_idx" ON "ProductPrice"("tenantId", "storeId", "productId");
CREATE INDEX "ProductPrice_tenantId_productId_idx" ON "ProductPrice"("tenantId", "productId");

CREATE INDEX "Product_tenantId_status_idx" ON "Product"("tenantId", "status");
CREATE INDEX "Product_tenantId_brandId_idx" ON "Product"("tenantId", "brandId");
CREATE INDEX "Product_tenantId_manufacturerId_idx" ON "Product"("tenantId", "manufacturerId");
CREATE INDEX "Product_tenantId_categoryId_idx" ON "Product"("tenantId", "categoryId");
CREATE INDEX "Product_tenantId_name_idx" ON "Product"("tenantId", "name");

CREATE INDEX "Supplier_tenantId_status_idx" ON "Supplier"("tenantId", "status");

CREATE UNIQUE INDEX "SupplierProduct_tenantId_supplierId_supplierProductCode_key" ON "SupplierProduct"("tenantId", "supplierId", "supplierProductCode");
CREATE UNIQUE INDEX "SupplierProduct_tenantId_supplierId_productId_key" ON "SupplierProduct"("tenantId", "supplierId", "productId");
CREATE INDEX "SupplierProduct_tenantId_productId_idx" ON "SupplierProduct"("tenantId", "productId");
CREATE INDEX "SupplierProduct_tenantId_supplierProductCode_idx" ON "SupplierProduct"("tenantId", "supplierProductCode");

CREATE INDEX "SupplierCostHistory_tenantId_supplierProductId_effectiveFrom_idx" ON "SupplierCostHistory"("tenantId", "supplierProductId", "effectiveFrom");
CREATE INDEX "SupplierCostHistory_tenantId_supplierProductId_idx" ON "SupplierCostHistory"("tenantId", "supplierProductId");

-- AddForeignKey
ALTER TABLE "Manufacturer" ADD CONSTRAINT "Manufacturer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Brand" ADD CONSTRAINT "Brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_tenantId_productId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_storeId_tenantId_fkey" FOREIGN KEY ("storeId", "tenantId") REFERENCES "Store"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_tenantId_fkey" FOREIGN KEY ("supplierId", "tenantId") REFERENCES "Supplier"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierCostHistory" ADD CONSTRAINT "SupplierCostHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierCostHistory" ADD CONSTRAINT "SupplierCostHistory_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
