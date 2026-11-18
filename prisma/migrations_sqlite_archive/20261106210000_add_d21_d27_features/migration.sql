-- AlterTable: wallets
ALTER TABLE "wallets" ADD COLUMN "penalty_debt" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: dispute_cases
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_deadline" DATETIME;
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_requested_at" DATETIME;
ALTER TABLE "dispute_cases" ADD COLUMN "paused_sla_ms" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: settlement_retry_queue
CREATE TABLE "settlement_retry_queue" (
    "retry_id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" DATETIME NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "last_error" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "settlement_retry_queue_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "settlement_retry_queue_booking_id_key" ON "settlement_retry_queue"("booking_id");
