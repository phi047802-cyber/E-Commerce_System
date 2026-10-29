-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'RENTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "companion_profiles" (
    "profile_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "verified_tier_id" TEXT NOT NULL,
    "hourly_rate" INTEGER NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "availability" TEXT NOT NULL DEFAULT 'OFFLINE',
    "trust_score" REAL NOT NULL DEFAULT 80.00,
    "audio_bio_url" TEXT,
    "game_account_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companion_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "companion_profiles_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game_catalog" ("game_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "companion_profiles_verified_tier_id_fkey" FOREIGN KEY ("verified_tier_id") REFERENCES "skill_rank_tier" ("tier_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_catalog" (
    "game_id" TEXT NOT NULL PRIMARY KEY,
    "game_name" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "skill_rank_tier" (
    "tier_id" TEXT NOT NULL PRIMARY KEY,
    "game_id" TEXT NOT NULL,
    "tier_name" TEXT NOT NULL,
    "rank_weight" INTEGER NOT NULL,
    CONSTRAINT "skill_rank_tier_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game_catalog" ("game_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "slot_calendar" (
    "slot_id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "held_until" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slot_calendar_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "companion_profiles" ("profile_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "booking_id" TEXT NOT NULL PRIMARY KEY,
    "renter_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "total_fee_snapshot" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "response_deadline" DATETIME NOT NULL,
    "confirm_deadline" DATETIME,
    "cancel_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "companion_profiles" ("profile_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slot_calendar" ("slot_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "history_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "booking_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "reason" TEXT,
    "changed_by" TEXT,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "booking_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "room_token" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "message_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_censored" BOOLEAN NOT NULL DEFAULT false,
    "original_content" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("session_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallets" (
    "wallet_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "wallet_type" TEXT NOT NULL DEFAULT 'STANDARD',
    "available_balance" INTEGER NOT NULL DEFAULT 0,
    "escrow_balance" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "escrows" (
    "escrow_id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "held_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frozen_at" DATETIME,
    "released_at" DATETIME,
    "refunded_at" DATETIME,
    CONSTRAINT "escrows_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "txn_id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT,
    "escrow_id" TEXT,
    "txn_type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ledger_transactions_escrow_id_fkey" FOREIGN KEY ("escrow_id") REFERENCES "escrows" ("escrow_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "entry_id" TEXT NOT NULL PRIMARY KEY,
    "txn_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "balance_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "ledger_transactions" ("txn_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("wallet_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" TEXT NOT NULL PRIMARY KEY,
    "txn_id" TEXT,
    "wallet_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MOCK_VNPAY',
    "gateway_ref" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    CONSTRAINT "payments_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "ledger_transactions" ("txn_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "platform_revenues" (
    "revenue_id" TEXT NOT NULL PRIMARY KEY,
    "txn_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "commission_rate" REAL NOT NULL DEFAULT 0.12,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_revenues_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "ledger_transactions" ("txn_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "withdraw_id" TEXT NOT NULL PRIMARY KEY,
    "wallet_id" TEXT NOT NULL,
    "txn_id" TEXT,
    "amount" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_no_masked" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "withdrawal_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("wallet_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "withdrawal_requests_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "ledger_transactions" ("txn_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispute_cases" (
    "dispute_id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT NOT NULL,
    "renter_id" TEXT NOT NULL,
    "reason_category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPENED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME,
    CONSTRAINT "dispute_cases_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dispute_cases_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispute_evidences" (
    "evidence_id" TEXT NOT NULL PRIMARY KEY,
    "dispute_id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispute_evidences_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "dispute_cases" ("dispute_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dispute_evidences_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispute_decisions" (
    "decision_id" TEXT NOT NULL PRIMARY KEY,
    "dispute_id" TEXT NOT NULL,
    "cs_agent_id" TEXT NOT NULL,
    "fault_percent" INTEGER NOT NULL,
    "refund_amount" INTEGER NOT NULL DEFAULT 0,
    "penalty_amount" INTEGER NOT NULL DEFAULT 0,
    "decision_reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispute_decisions_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "dispute_cases" ("dispute_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dispute_decisions_cs_agent_id_fkey" FOREIGN KEY ("cs_agent_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "review_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "booking_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trust_score_logs" (
    "log_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "reason_code" TEXT NOT NULL,
    "delta" REAL NOT NULL,
    "score_after" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trust_score_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "companion_profiles" ("profile_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trust_score_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload_json" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ledger_audit_alerts" (
    "alert_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "txn_id" TEXT,
    "error_code" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "context_json" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_audit_alerts_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "ledger_transactions" ("txn_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ledger_audit_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companion_profiles_user_id_key" ON "companion_profiles"("user_id");

-- CreateIndex
CREATE INDEX "slot_calendar_profile_id_start_time_idx" ON "slot_calendar"("profile_id", "start_time");

-- CreateIndex
CREATE INDEX "slot_calendar_status_held_until_idx" ON "slot_calendar"("status", "held_until");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_slot_id_key" ON "bookings"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_request_key_key" ON "bookings"("request_key");

-- CreateIndex
CREATE INDEX "bookings_renter_id_idx" ON "bookings"("renter_id");

-- CreateIndex
CREATE INDEX "bookings_profile_id_idx" ON "bookings"("profile_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_idx" ON "booking_status_history"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_booking_id_key" ON "sessions"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_room_token_key" ON "sessions"("room_token");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_booking_id_key" ON "escrows"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_transactions_idempotency_key_idx" ON "ledger_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_transactions_booking_id_idx" ON "ledger_transactions"("booking_id");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_created_at_idx" ON "ledger_entries"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_txn_id_idx" ON "ledger_entries"("txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_txn_id_key" ON "payments"("txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_ref_key" ON "payments"("gateway_ref");

-- CreateIndex
CREATE INDEX "payments_gateway_ref_idx" ON "payments"("gateway_ref");

-- CreateIndex
CREATE UNIQUE INDEX "platform_revenues_txn_id_key" ON "platform_revenues"("txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_requests_txn_id_key" ON "withdrawal_requests"("txn_id");

-- CreateIndex
CREATE INDEX "withdrawal_requests_wallet_id_idx" ON "withdrawal_requests"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_cases_booking_id_key" ON "dispute_cases"("booking_id");

-- CreateIndex
CREATE INDEX "dispute_evidences_dispute_id_idx" ON "dispute_evidences"("dispute_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_decisions_dispute_id_key" ON "dispute_decisions"("dispute_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_reviewer_id_key" ON "reviews"("booking_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "trust_score_logs_profile_id_idx" ON "trust_score_logs"("profile_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ledger_audit_alerts_is_resolved_idx" ON "ledger_audit_alerts"("is_resolved");
