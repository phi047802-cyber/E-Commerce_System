-- AlterTable
ALTER TABLE "dispute_cases" ADD COLUMN "companion_explained_at" DATETIME;
ALTER TABLE "dispute_cases" ADD COLUMN "companion_explanation" TEXT;
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_request_note" TEXT;
ALTER TABLE "dispute_cases" ADD COLUMN "evidence_requested_by" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "target_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "date_of_birth" DATETIME;
ALTER TABLE "users" ADD COLUMN "favorite_games" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companion_profiles" (
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
    "max_hours_per_day" INTEGER NOT NULL DEFAULT 10,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companion_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "companion_profiles_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game_catalog" ("game_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "companion_profiles_verified_tier_id_fkey" FOREIGN KEY ("verified_tier_id") REFERENCES "skill_rank_tier" ("tier_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_companion_profiles" ("audio_bio_url", "availability", "created_at", "game_account_id", "game_id", "hourly_rate", "profile_id", "trust_score", "user_id", "verification_status", "verified_tier_id") SELECT "audio_bio_url", "availability", "created_at", "game_account_id", "game_id", "hourly_rate", "profile_id", "trust_score", "user_id", "verification_status", "verified_tier_id" FROM "companion_profiles";
DROP TABLE "companion_profiles";
ALTER TABLE "new_companion_profiles" RENAME TO "companion_profiles";
CREATE UNIQUE INDEX "companion_profiles_user_id_key" ON "companion_profiles"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
