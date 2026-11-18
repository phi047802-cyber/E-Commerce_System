BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [user_id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [display_name] NVARCHAR(1000) NOT NULL,
    [phone_number] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'RENTER',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'ACTIVE',
    [suspended_until] DATETIME2,
    [is_email_verified] BIT NOT NULL CONSTRAINT [users_is_email_verified_df] DEFAULT 1,
    [avatar_url] NVARCHAR(max),
    [bio] NVARCHAR(max),
    [date_of_birth] DATETIME2,
    [favorite_games] NVARCHAR(max),
    [google_id] NVARCHAR(1000),
    [is_onboarding_completed] BIT NOT NULL CONSTRAINT [users_is_onboarding_completed_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([user_id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[companion_profiles] (
    [profile_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [game_id] NVARCHAR(1000),
    [verified_tier_id] NVARCHAR(1000),
    [hourly_rate] INT,
    [profile_status] NVARCHAR(1000) NOT NULL CONSTRAINT [companion_profiles_profile_status_df] DEFAULT 'INCOMPLETE',
    [verification_status] NVARCHAR(1000) NOT NULL CONSTRAINT [companion_profiles_verification_status_df] DEFAULT 'UNVERIFIED',
    [availability] NVARCHAR(1000) NOT NULL CONSTRAINT [companion_profiles_availability_df] DEFAULT 'OFFLINE',
    [trust_score] FLOAT(53) NOT NULL CONSTRAINT [companion_profiles_trust_score_df] DEFAULT 80.00,
    [audio_bio_url] NVARCHAR(max),
    [game_account_id] NVARCHAR(1000),
    [max_hours_per_day] INT NOT NULL CONSTRAINT [companion_profiles_max_hours_per_day_df] DEFAULT 10,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [companion_profiles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [companion_profiles_pkey] PRIMARY KEY CLUSTERED ([profile_id]),
    CONSTRAINT [companion_profiles_user_id_key] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[game_catalog] (
    [game_id] NVARCHAR(1000) NOT NULL,
    [game_name] NVARCHAR(1000) NOT NULL,
    [publisher] NVARCHAR(1000) NOT NULL,
    [genre] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [game_catalog_category_df] DEFAULT 'GAME',
    [description] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [game_catalog_is_active_df] DEFAULT 1,
    CONSTRAINT [game_catalog_pkey] PRIMARY KEY CLUSTERED ([game_id])
);

-- CreateTable
CREATE TABLE [dbo].[skill_rank_tier] (
    [tier_id] NVARCHAR(1000) NOT NULL,
    [game_id] NVARCHAR(1000) NOT NULL,
    [tier_name] NVARCHAR(1000) NOT NULL,
    [rank_weight] INT NOT NULL,
    CONSTRAINT [skill_rank_tier_pkey] PRIMARY KEY CLUSTERED ([tier_id])
);

-- CreateTable
CREATE TABLE [dbo].[slot_calendar] (
    [slot_id] NVARCHAR(1000) NOT NULL,
    [profile_id] NVARCHAR(1000) NOT NULL,
    [start_time] DATETIME2 NOT NULL,
    [end_time] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [slot_calendar_status_df] DEFAULT 'AVAILABLE',
    [held_until] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [slot_calendar_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [slot_calendar_pkey] PRIMARY KEY CLUSTERED ([slot_id])
);

-- CreateTable
CREATE TABLE [dbo].[bookings] (
    [booking_id] NVARCHAR(1000) NOT NULL,
    [renter_id] NVARCHAR(1000) NOT NULL,
    [profile_id] NVARCHAR(1000) NOT NULL,
    [slot_id] NVARCHAR(1000) NOT NULL,
    [request_key] NVARCHAR(1000) NOT NULL,
    [start_time] DATETIME2 NOT NULL,
    [duration_hours] INT NOT NULL,
    [total_fee_snapshot] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [bookings_status_df] DEFAULT 'PENDING_ACCEPTANCE',
    [response_deadline] DATETIME2 NOT NULL,
    [confirm_deadline] DATETIME2,
    [cancel_reason] NVARCHAR(max),
    [cancelled_by] NVARCHAR(1000),
    [cancelled_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [bookings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [bookings_pkey] PRIMARY KEY CLUSTERED ([booking_id]),
    CONSTRAINT [bookings_slot_id_key] UNIQUE NONCLUSTERED ([slot_id]),
    CONSTRAINT [bookings_request_key_key] UNIQUE NONCLUSTERED ([request_key])
);

-- CreateTable
CREATE TABLE [dbo].[booking_status_history] (
    [history_id] INT NOT NULL IDENTITY(1,1),
    [booking_id] NVARCHAR(1000) NOT NULL,
    [from_status] NVARCHAR(1000),
    [to_status] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(max),
    [changed_by] NVARCHAR(1000),
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [booking_status_history_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [booking_status_history_pkey] PRIMARY KEY CLUSTERED ([history_id])
);

-- CreateTable
CREATE TABLE [dbo].[sessions] (
    [session_id] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [sessions_status_df] DEFAULT 'SCHEDULED',
    [start_time] DATETIME2 NOT NULL,
    [end_time] DATETIME2 NOT NULL,
    [room_token] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [sessions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [sessions_pkey] PRIMARY KEY CLUSTERED ([session_id]),
    CONSTRAINT [sessions_booking_id_key] UNIQUE NONCLUSTERED ([booking_id]),
    CONSTRAINT [sessions_room_token_key] UNIQUE NONCLUSTERED ([room_token])
);

-- CreateTable
CREATE TABLE [dbo].[call_logs] (
    [call_id] NVARCHAR(1000) NOT NULL,
    [session_id] NVARCHAR(1000) NOT NULL,
    [caller_id] NVARCHAR(1000) NOT NULL,
    [receiver_id] NVARCHAR(1000),
    [started_at] DATETIME2 NOT NULL CONSTRAINT [call_logs_started_at_df] DEFAULT CURRENT_TIMESTAMP,
    [ended_at] DATETIME2,
    [duration_sec] INT NOT NULL CONSTRAINT [call_logs_duration_sec_df] DEFAULT 0,
    [events] NVARCHAR(max),
    [result] NVARCHAR(1000) NOT NULL CONSTRAINT [call_logs_result_df] DEFAULT 'COMPLETED',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [call_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [call_logs_pkey] PRIMARY KEY CLUSTERED ([call_id])
);

-- CreateTable
CREATE TABLE [dbo].[chat_messages] (
    [message_id] INT NOT NULL IDENTITY(1,1),
    [session_id] NVARCHAR(1000) NOT NULL,
    [sender_id] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [is_censored] BIT NOT NULL CONSTRAINT [chat_messages_is_censored_df] DEFAULT 0,
    [original_content] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [chat_messages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [chat_messages_pkey] PRIMARY KEY CLUSTERED ([message_id])
);

-- CreateTable
CREATE TABLE [dbo].[wallets] (
    [wallet_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [wallet_type] NVARCHAR(1000) NOT NULL CONSTRAINT [wallets_wallet_type_df] DEFAULT 'STANDARD',
    [available_balance] INT NOT NULL CONSTRAINT [wallets_available_balance_df] DEFAULT 0,
    [escrow_balance] INT NOT NULL CONSTRAINT [wallets_escrow_balance_df] DEFAULT 0,
    [penalty_debt] INT NOT NULL CONSTRAINT [wallets_penalty_debt_df] DEFAULT 0,
    [version] INT NOT NULL CONSTRAINT [wallets_version_df] DEFAULT 1,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [wallets_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [wallets_pkey] PRIMARY KEY CLUSTERED ([wallet_id]),
    CONSTRAINT [wallets_user_id_key] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[escrows] (
    [escrow_id] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000) NOT NULL,
    [amount] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [escrows_status_df] DEFAULT 'HELD',
    [held_at] DATETIME2 NOT NULL CONSTRAINT [escrows_held_at_df] DEFAULT CURRENT_TIMESTAMP,
    [frozen_at] DATETIME2,
    [released_at] DATETIME2,
    [refunded_at] DATETIME2,
    CONSTRAINT [escrows_pkey] PRIMARY KEY CLUSTERED ([escrow_id]),
    CONSTRAINT [escrows_booking_id_key] UNIQUE NONCLUSTERED ([booking_id])
);

-- CreateTable
CREATE TABLE [dbo].[ledger_transactions] (
    [txn_id] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000),
    [escrow_id] NVARCHAR(1000),
    [txn_type] NVARCHAR(1000) NOT NULL,
    [idempotency_key] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ledger_transactions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ledger_transactions_pkey] PRIMARY KEY CLUSTERED ([txn_id]),
    CONSTRAINT [ledger_transactions_idempotency_key_key] UNIQUE NONCLUSTERED ([idempotency_key])
);

-- CreateTable
CREATE TABLE [dbo].[ledger_entries] (
    [entry_id] NVARCHAR(1000) NOT NULL,
    [txn_id] NVARCHAR(1000) NOT NULL,
    [wallet_id] NVARCHAR(1000) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL,
    [balance_type] NVARCHAR(1000) NOT NULL,
    [amount] INT NOT NULL,
    [balance_after] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ledger_entries_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ledger_entries_pkey] PRIMARY KEY CLUSTERED ([entry_id])
);

-- CreateTable
CREATE TABLE [dbo].[payments] (
    [payment_id] NVARCHAR(1000) NOT NULL,
    [txn_id] NVARCHAR(1000),
    [wallet_id] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL CONSTRAINT [payments_provider_df] DEFAULT 'MOCK_VNPAY',
    [gateway_ref] NVARCHAR(1000) NOT NULL,
    [amount] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [payments_status_df] DEFAULT 'PENDING',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [payments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [processed_at] DATETIME2,
    [expires_at] DATETIME2,
    [qr_url] NVARCHAR(max),
    [sepay_id] NVARCHAR(1000),
    CONSTRAINT [payments_pkey] PRIMARY KEY CLUSTERED ([payment_id]),
    CONSTRAINT [payments_gateway_ref_key] UNIQUE NONCLUSTERED ([gateway_ref])
);

-- CreateTable
CREATE TABLE [dbo].[platform_revenues] (
    [revenue_id] NVARCHAR(1000) NOT NULL,
    [txn_id] NVARCHAR(1000) NOT NULL,
    [amount] INT NOT NULL,
    [commission_rate] FLOAT(53) NOT NULL CONSTRAINT [platform_revenues_commission_rate_df] DEFAULT 0.12,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [platform_revenues_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [platform_revenues_pkey] PRIMARY KEY CLUSTERED ([revenue_id]),
    CONSTRAINT [platform_revenues_txn_id_key] UNIQUE NONCLUSTERED ([txn_id])
);

-- CreateTable
CREATE TABLE [dbo].[withdrawal_requests] (
    [withdraw_id] NVARCHAR(1000) NOT NULL,
    [wallet_id] NVARCHAR(1000) NOT NULL,
    [txn_id] NVARCHAR(1000),
    [amount] INT NOT NULL,
    [bank_name] NVARCHAR(1000) NOT NULL,
    [account_no_masked] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [withdrawal_requests_status_df] DEFAULT 'PENDING',
    [processed_by] NVARCHAR(1000),
    [reject_reason] NVARCHAR(max),
    [payout_code] NVARCHAR(1000),
    [idempotency_key] NVARCHAR(1000),
    [processed_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [withdrawal_requests_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [withdrawal_requests_pkey] PRIMARY KEY CLUSTERED ([withdraw_id])
);

-- CreateTable
CREATE TABLE [dbo].[dispute_cases] (
    [dispute_id] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000) NOT NULL,
    [renter_id] NVARCHAR(1000) NOT NULL,
    [reason_category] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [dispute_cases_status_df] DEFAULT 'OPENED',
    [evidence_deadline] DATETIME2,
    [evidence_requested_at] DATETIME2,
    [paused_sla_ms] INT NOT NULL CONSTRAINT [dispute_cases_paused_sla_ms_df] DEFAULT 0,
    [evidence_requested_by] NVARCHAR(1000),
    [evidence_request_note] NVARCHAR(max),
    [companion_explanation] NVARCHAR(max),
    [companion_explained_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [dispute_cases_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [resolved_at] DATETIME2,
    CONSTRAINT [dispute_cases_pkey] PRIMARY KEY CLUSTERED ([dispute_id]),
    CONSTRAINT [dispute_cases_booking_id_key] UNIQUE NONCLUSTERED ([booking_id])
);

-- CreateTable
CREATE TABLE [dbo].[dispute_evidences] (
    [evidence_id] NVARCHAR(1000) NOT NULL,
    [dispute_id] NVARCHAR(1000) NOT NULL,
    [uploader_id] NVARCHAR(1000) NOT NULL,
    [file_url] NVARCHAR(max) NOT NULL,
    [file_type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [dispute_evidences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [dispute_evidences_pkey] PRIMARY KEY CLUSTERED ([evidence_id])
);

-- CreateTable
CREATE TABLE [dbo].[dispute_decisions] (
    [decision_id] NVARCHAR(1000) NOT NULL,
    [dispute_id] NVARCHAR(1000) NOT NULL,
    [cs_agent_id] NVARCHAR(1000) NOT NULL,
    [fault_percent] INT NOT NULL,
    [refund_amount] INT NOT NULL CONSTRAINT [dispute_decisions_refund_amount_df] DEFAULT 0,
    [penalty_amount] INT NOT NULL CONSTRAINT [dispute_decisions_penalty_amount_df] DEFAULT 0,
    [decision_reason] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [dispute_decisions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [dispute_decisions_pkey] PRIMARY KEY CLUSTERED ([decision_id]),
    CONSTRAINT [dispute_decisions_dispute_id_key] UNIQUE NONCLUSTERED ([dispute_id])
);

-- CreateTable
CREATE TABLE [dbo].[reviews] (
    [review_id] INT NOT NULL IDENTITY(1,1),
    [booking_id] NVARCHAR(1000) NOT NULL,
    [reviewer_id] NVARCHAR(1000) NOT NULL,
    [reviewee_id] NVARCHAR(1000) NOT NULL,
    [rating] INT NOT NULL,
    [comment] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [reviews_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [reviews_pkey] PRIMARY KEY CLUSTERED ([review_id]),
    CONSTRAINT [reviews_booking_id_reviewer_id_key] UNIQUE NONCLUSTERED ([booking_id],[reviewer_id])
);

-- CreateTable
CREATE TABLE [dbo].[trust_score_logs] (
    [log_id] INT NOT NULL IDENTITY(1,1),
    [profile_id] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000),
    [reason_code] NVARCHAR(1000) NOT NULL,
    [delta] FLOAT(53) NOT NULL,
    [score_after] FLOAT(53) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [trust_score_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [trust_score_logs_pkey] PRIMARY KEY CLUSTERED ([log_id])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [notification_id] INT NOT NULL IDENTITY(1,1),
    [user_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [target_url] NVARCHAR(max),
    [is_read] BIT NOT NULL CONSTRAINT [notifications_is_read_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([notification_id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [audit_id] INT NOT NULL IDENTITY(1,1),
    [actor_id] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [payload_json] NVARCHAR(max),
    [ip_address] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([audit_id])
);

-- CreateTable
CREATE TABLE [dbo].[ledger_audit_alerts] (
    [alert_id] INT NOT NULL IDENTITY(1,1),
    [txn_id] NVARCHAR(1000),
    [error_code] NVARCHAR(1000) NOT NULL,
    [error_message] NVARCHAR(max) NOT NULL,
    [context_json] NVARCHAR(max),
    [repeat_count] INT NOT NULL CONSTRAINT [ledger_audit_alerts_repeat_count_df] DEFAULT 1,
    [is_resolved] BIT NOT NULL CONSTRAINT [ledger_audit_alerts_is_resolved_df] DEFAULT 0,
    [resolved_by] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ledger_audit_alerts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [ledger_audit_alerts_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ledger_audit_alerts_pkey] PRIMARY KEY CLUSTERED ([alert_id])
);

-- CreateTable
CREATE TABLE [dbo].[auth_otps] (
    [otp_id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [otp_hash] NVARCHAR(1000) NOT NULL,
    [purpose] NVARCHAR(1000) NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [auth_otps_attempts_df] DEFAULT 0,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [auth_otps_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [auth_otps_pkey] PRIMARY KEY CLUSTERED ([otp_id])
);

-- CreateTable
CREATE TABLE [dbo].[kyc_records] (
    [kyc_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [id_front_path] NVARCHAR(1000) NOT NULL,
    [id_front_iv] NVARCHAR(1000) NOT NULL,
    [id_front_tag] NVARCHAR(1000) NOT NULL,
    [id_back_path] NVARCHAR(1000) NOT NULL,
    [id_back_iv] NVARCHAR(1000) NOT NULL,
    [id_back_tag] NVARCHAR(1000) NOT NULL,
    [selfie_path] NVARCHAR(1000) NOT NULL,
    [selfie_iv] NVARCHAR(1000) NOT NULL,
    [selfie_tag] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [kyc_records_status_df] DEFAULT 'PENDING',
    [rejection_reason] NVARCHAR(max),
    [reviewed_by] NVARCHAR(1000),
    [reviewed_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [kyc_records_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [kyc_records_pkey] PRIMARY KEY CLUSTERED ([kyc_id])
);

-- CreateTable
CREATE TABLE [dbo].[site_visits] (
    [visit_id] NVARCHAR(1000) NOT NULL,
    [session_key] NVARCHAR(1000) NOT NULL,
    [ip_hash] NVARCHAR(1000),
    [user_agent] NVARCHAR(max),
    [utm_source] NVARCHAR(1000),
    [utm_medium] NVARCHAR(1000),
    [utm_campaign] NVARCHAR(1000),
    [landing_path] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [site_visits_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [site_visits_pkey] PRIMARY KEY CLUSTERED ([visit_id]),
    CONSTRAINT [site_visits_session_key_key] UNIQUE NONCLUSTERED ([session_key])
);

-- CreateTable
CREATE TABLE [dbo].[settlement_retry_queue] (
    [retry_id] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000) NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [settlement_retry_queue_attempts_df] DEFAULT 0,
    [max_attempts] INT NOT NULL CONSTRAINT [settlement_retry_queue_max_attempts_df] DEFAULT 3,
    [next_retry_at] DATETIME2 NOT NULL,
    [idempotency_key] NVARCHAR(1000) NOT NULL,
    [last_error] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [settlement_retry_queue_status_df] DEFAULT 'PENDING',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [settlement_retry_queue_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [settlement_retry_queue_pkey] PRIMARY KEY CLUSTERED ([retry_id]),
    CONSTRAINT [settlement_retry_queue_booking_id_key] UNIQUE NONCLUSTERED ([booking_id])
);

-- CreateTable
CREATE TABLE [dbo].[news] (
    [news_id] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(max) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [image_url] NVARCHAR(1000) NOT NULL,
    [author] NVARCHAR(1000) NOT NULL CONSTRAINT [news_author_df] DEFAULT 'Ban Quản Trị INSTASQUAD',
    [published_at] DATETIME2 NOT NULL CONSTRAINT [news_published_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [news_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [news_pkey] PRIMARY KEY CLUSTERED ([news_id]),
    CONSTRAINT [news_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[terms_acceptances] (
    [acceptance_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [terms_version] NVARCHAR(1000) NOT NULL,
    [channel] NVARCHAR(1000) NOT NULL CONSTRAINT [terms_acceptances_channel_df] DEFAULT 'WEB',
    [ip_hash] NVARCHAR(1000),
    [accepted_at] DATETIME2 NOT NULL CONSTRAINT [terms_acceptances_accepted_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [terms_acceptances_pkey] PRIMARY KEY CLUSTERED ([acceptance_id]),
    CONSTRAINT [terms_acceptances_user_id_terms_version_key] UNIQUE NONCLUSTERED ([user_id],[terms_version])
);

-- CreateTable
CREATE TABLE [dbo].[violation_records] (
    [violation_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [booking_id] NVARCHAR(1000),
    [trust_delta] FLOAT(53) NOT NULL CONSTRAINT [violation_records_trust_delta_df] DEFAULT 0,
    [suspension_days] INT NOT NULL CONSTRAINT [violation_records_suspension_days_df] DEFAULT 0,
    [note] NVARCHAR(max) NOT NULL,
    [recorded_by] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [violation_records_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [violation_records_pkey] PRIMARY KEY CLUSTERED ([violation_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [slot_calendar_profile_id_start_time_idx] ON [dbo].[slot_calendar]([profile_id], [start_time]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [slot_calendar_status_held_until_idx] ON [dbo].[slot_calendar]([status], [held_until]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bookings_renter_id_idx] ON [dbo].[bookings]([renter_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bookings_profile_id_idx] ON [dbo].[bookings]([profile_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [bookings_status_idx] ON [dbo].[bookings]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [booking_status_history_booking_id_idx] ON [dbo].[booking_status_history]([booking_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [call_logs_session_id_idx] ON [dbo].[call_logs]([session_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [chat_messages_session_id_created_at_idx] ON [dbo].[chat_messages]([session_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ledger_transactions_idempotency_key_idx] ON [dbo].[ledger_transactions]([idempotency_key]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ledger_transactions_booking_id_idx] ON [dbo].[ledger_transactions]([booking_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ledger_entries_wallet_id_created_at_idx] ON [dbo].[ledger_entries]([wallet_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ledger_entries_txn_id_idx] ON [dbo].[ledger_entries]([txn_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [payments_gateway_ref_idx] ON [dbo].[payments]([gateway_ref]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [withdrawal_requests_wallet_id_idx] ON [dbo].[withdrawal_requests]([wallet_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [dispute_evidences_dispute_id_idx] ON [dbo].[dispute_evidences]([dispute_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trust_score_logs_profile_id_idx] ON [dbo].[trust_score_logs]([profile_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_user_id_is_read_idx] ON [dbo].[notifications]([user_id], [is_read]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_entity_type_entity_id_idx] ON [dbo].[audit_logs]([entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ledger_audit_alerts_is_resolved_idx] ON [dbo].[ledger_audit_alerts]([is_resolved]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [auth_otps_email_purpose_idx] ON [dbo].[auth_otps]([email], [purpose]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [kyc_records_user_id_idx] ON [dbo].[kyc_records]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [kyc_records_status_idx] ON [dbo].[kyc_records]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [news_slug_idx] ON [dbo].[news]([slug]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [news_category_idx] ON [dbo].[news]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [violation_records_user_id_code_idx] ON [dbo].[violation_records]([user_id], [code]);

-- AddForeignKey
ALTER TABLE [dbo].[companion_profiles] ADD CONSTRAINT [companion_profiles_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[companion_profiles] ADD CONSTRAINT [companion_profiles_game_id_fkey] FOREIGN KEY ([game_id]) REFERENCES [dbo].[game_catalog]([game_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[companion_profiles] ADD CONSTRAINT [companion_profiles_verified_tier_id_fkey] FOREIGN KEY ([verified_tier_id]) REFERENCES [dbo].[skill_rank_tier]([tier_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[skill_rank_tier] ADD CONSTRAINT [skill_rank_tier_game_id_fkey] FOREIGN KEY ([game_id]) REFERENCES [dbo].[game_catalog]([game_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[slot_calendar] ADD CONSTRAINT [slot_calendar_profile_id_fkey] FOREIGN KEY ([profile_id]) REFERENCES [dbo].[companion_profiles]([profile_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_renter_id_fkey] FOREIGN KEY ([renter_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_profile_id_fkey] FOREIGN KEY ([profile_id]) REFERENCES [dbo].[companion_profiles]([profile_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_slot_id_fkey] FOREIGN KEY ([slot_id]) REFERENCES [dbo].[slot_calendar]([slot_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[bookings] ADD CONSTRAINT [bookings_cancelled_by_fkey] FOREIGN KEY ([cancelled_by]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[booking_status_history] ADD CONSTRAINT [booking_status_history_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[booking_status_history] ADD CONSTRAINT [booking_status_history_changed_by_fkey] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[users]([user_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sessions] ADD CONSTRAINT [sessions_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[call_logs] ADD CONSTRAINT [call_logs_session_id_fkey] FOREIGN KEY ([session_id]) REFERENCES [dbo].[sessions]([session_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[call_logs] ADD CONSTRAINT [call_logs_caller_id_fkey] FOREIGN KEY ([caller_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[call_logs] ADD CONSTRAINT [call_logs_receiver_id_fkey] FOREIGN KEY ([receiver_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[chat_messages] ADD CONSTRAINT [chat_messages_session_id_fkey] FOREIGN KEY ([session_id]) REFERENCES [dbo].[sessions]([session_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[chat_messages] ADD CONSTRAINT [chat_messages_sender_id_fkey] FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[wallets] ADD CONSTRAINT [wallets_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[escrows] ADD CONSTRAINT [escrows_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ledger_transactions] ADD CONSTRAINT [ledger_transactions_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ledger_transactions] ADD CONSTRAINT [ledger_transactions_escrow_id_fkey] FOREIGN KEY ([escrow_id]) REFERENCES [dbo].[escrows]([escrow_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ledger_entries] ADD CONSTRAINT [ledger_entries_txn_id_fkey] FOREIGN KEY ([txn_id]) REFERENCES [dbo].[ledger_transactions]([txn_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ledger_entries] ADD CONSTRAINT [ledger_entries_wallet_id_fkey] FOREIGN KEY ([wallet_id]) REFERENCES [dbo].[wallets]([wallet_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_txn_id_fkey] FOREIGN KEY ([txn_id]) REFERENCES [dbo].[ledger_transactions]([txn_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[platform_revenues] ADD CONSTRAINT [platform_revenues_txn_id_fkey] FOREIGN KEY ([txn_id]) REFERENCES [dbo].[ledger_transactions]([txn_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[withdrawal_requests] ADD CONSTRAINT [withdrawal_requests_wallet_id_fkey] FOREIGN KEY ([wallet_id]) REFERENCES [dbo].[wallets]([wallet_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[withdrawal_requests] ADD CONSTRAINT [withdrawal_requests_txn_id_fkey] FOREIGN KEY ([txn_id]) REFERENCES [dbo].[ledger_transactions]([txn_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[dispute_cases] ADD CONSTRAINT [dispute_cases_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[dispute_cases] ADD CONSTRAINT [dispute_cases_renter_id_fkey] FOREIGN KEY ([renter_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[dispute_evidences] ADD CONSTRAINT [dispute_evidences_dispute_id_fkey] FOREIGN KEY ([dispute_id]) REFERENCES [dbo].[dispute_cases]([dispute_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[dispute_evidences] ADD CONSTRAINT [dispute_evidences_uploader_id_fkey] FOREIGN KEY ([uploader_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[dispute_decisions] ADD CONSTRAINT [dispute_decisions_dispute_id_fkey] FOREIGN KEY ([dispute_id]) REFERENCES [dbo].[dispute_cases]([dispute_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[dispute_decisions] ADD CONSTRAINT [dispute_decisions_cs_agent_id_fkey] FOREIGN KEY ([cs_agent_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[reviews] ADD CONSTRAINT [reviews_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[reviews] ADD CONSTRAINT [reviews_reviewer_id_fkey] FOREIGN KEY ([reviewer_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[reviews] ADD CONSTRAINT [reviews_reviewee_id_fkey] FOREIGN KEY ([reviewee_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[trust_score_logs] ADD CONSTRAINT [trust_score_logs_profile_id_fkey] FOREIGN KEY ([profile_id]) REFERENCES [dbo].[companion_profiles]([profile_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[trust_score_logs] ADD CONSTRAINT [trust_score_logs_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_actor_id_fkey] FOREIGN KEY ([actor_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ledger_audit_alerts] ADD CONSTRAINT [ledger_audit_alerts_txn_id_fkey] FOREIGN KEY ([txn_id]) REFERENCES [dbo].[ledger_transactions]([txn_id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ledger_audit_alerts] ADD CONSTRAINT [ledger_audit_alerts_resolved_by_fkey] FOREIGN KEY ([resolved_by]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[kyc_records] ADD CONSTRAINT [kyc_records_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[kyc_records] ADD CONSTRAINT [kyc_records_reviewed_by_fkey] FOREIGN KEY ([reviewed_by]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[settlement_retry_queue] ADD CONSTRAINT [settlement_retry_queue_booking_id_fkey] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([booking_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[terms_acceptances] ADD CONSTRAINT [terms_acceptances_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[violation_records] ADD CONSTRAINT [violation_records_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[violation_records] ADD CONSTRAINT [violation_records_recorded_by_fkey] FOREIGN KEY ([recorded_by]) REFERENCES [dbo].[users]([user_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- D34: filtered unique index thay cho UNIQUE constraint trên cột nullable
CREATE UNIQUE NONCLUSTERED INDEX [users_google_id_key] ON [dbo].[users]([google_id]) WHERE [google_id] IS NOT NULL;

-- D34: filtered unique index thay cho UNIQUE constraint trên cột nullable
CREATE UNIQUE NONCLUSTERED INDEX [payments_txn_id_key] ON [dbo].[payments]([txn_id]) WHERE [txn_id] IS NOT NULL;

-- D34: filtered unique index thay cho UNIQUE constraint trên cột nullable
CREATE UNIQUE NONCLUSTERED INDEX [withdrawal_requests_txn_id_key] ON [dbo].[withdrawal_requests]([txn_id]) WHERE [txn_id] IS NOT NULL;

-- D34: filtered unique index thay cho UNIQUE constraint trên cột nullable
CREATE UNIQUE NONCLUSTERED INDEX [withdrawal_requests_idempotency_key_key] ON [dbo].[withdrawal_requests]([idempotency_key]) WHERE [idempotency_key] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

