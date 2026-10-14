CREATE TABLE "CatalogEmployeeSession" ("id" UUID NOT NULL, "employeeId" UUID NOT NULL, "tokenHash" TEXT NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), CONSTRAINT "CatalogEmployeeSession_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CatalogEmployeeSession_tokenHash_key" ON "CatalogEmployeeSession"("tokenHash");
CREATE INDEX "CatalogEmployeeSession_employeeId_expiresAt_idx" ON "CatalogEmployeeSession"("employeeId","expiresAt");
ALTER TABLE "CatalogEmployeeSession" ADD CONSTRAINT "CatalogEmployeeSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON UPDATE CASCADE ON DELETE CASCADE;
