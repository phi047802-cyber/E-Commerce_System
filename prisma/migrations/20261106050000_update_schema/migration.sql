-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN "idempotency_key" TEXT;
ALTER TABLE "withdrawal_requests" ADD COLUMN "payout_code" TEXT;
ALTER TABLE "withdrawal_requests" ADD COLUMN "processed_by" TEXT;
ALTER TABLE "withdrawal_requests" ADD COLUMN "reject_reason" TEXT;

-- CreateTable
CREATE TABLE "auth_otps" (
    "otp_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "kyc_records" (
    "kyc_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "id_front_path" TEXT NOT NULL,
    "id_front_iv" TEXT NOT NULL,
    "id_front_tag" TEXT NOT NULL,
    "id_back_path" TEXT NOT NULL,
    "id_back_iv" TEXT NOT NULL,
    "id_back_tag" TEXT NOT NULL,
    "selfie_path" TEXT NOT NULL,
    "selfie_iv" TEXT NOT NULL,
    "selfie_tag" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kyc_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "kyc_records_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "site_visits" (
    "visit_id" TEXT NOT NULL PRIMARY KEY,
    "session_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ledger_audit_alerts" (
    "alert_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "txn_id" TEXT,
    "error_code" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "context_json" TEXT,
    "repeat_count" INTEGER NOT NULL DEFAULT 1,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_audit_alerts_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "ledger_transactions" ("txn_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ledger_audit_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ledger_audit_alerts" ("alert_id", "context_json", "created_at", "error_code", "error_message", "is_resolved", "resolved_by", "txn_id") SELECT "alert_id", "context_json", "created_at", "error_code", "error_message", "is_resolved", "resolved_by", "txn_id" FROM "ledger_audit_alerts";
DROP TABLE "ledger_audit_alerts";
ALTER TABLE "new_ledger_audit_alerts" RENAME TO "ledger_audit_alerts";
CREATE INDEX "ledger_audit_alerts_is_resolved_idx" ON "ledger_audit_alerts"("is_resolved");
CREATE TABLE "new_users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'RENTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_email_verified" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("created_at", "display_name", "email", "password_hash", "phone_number", "role", "status", "user_id") SELECT "created_at", "display_name", "email", "password_hash", "phone_number", "role", "status", "user_id" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "auth_otps_email_purpose_idx" ON "auth_otps"("email", "purpose");

-- CreateIndex
CREATE INDEX "kyc_records_user_id_idx" ON "kyc_records"("user_id");

-- CreateIndex
CREATE INDEX "kyc_records_status_idx" ON "kyc_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "site_visits_session_key_key" ON "site_visits"("session_key");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_requests_idempotency_key_key" ON "withdrawal_requests"("idempotency_key");
