-- RTC audit history. Apply through the normal Prisma migration workflow.
CREATE TABLE IF NOT EXISTS "RtcAuditEvent" (
  "id" UUID NOT NULL,
  "rtcId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "saleId" UUID,
  "quantity" INTEGER,
  "remainingBefore" INTEGER,
  "remainingAfter" INTEGER,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RtcAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RtcAuditEvent_rtcId_fkey" FOREIGN KEY ("rtcId") REFERENCES "RtcMarkdown"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RtcAuditEvent_rtcId_createdAt_idx" ON "RtcAuditEvent"("rtcId", "createdAt");
CREATE INDEX IF NOT EXISTS "RtcAuditEvent_saleId_idx" ON "RtcAuditEvent"("saleId");
