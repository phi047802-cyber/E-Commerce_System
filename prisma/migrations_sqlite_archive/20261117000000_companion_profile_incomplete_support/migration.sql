-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companion_profiles" (
    "profile_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT,
    "verified_tier_id" TEXT,
    "hourly_rate" INTEGER,
    "profile_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "availability" TEXT NOT NULL DEFAULT 'OFFLINE',
    "trust_score" REAL NOT NULL DEFAULT 80.00,
    "audio_bio_url" TEXT,
    "game_account_id" TEXT,
    "max_hours_per_day" INTEGER NOT NULL DEFAULT 10,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companion_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "companion_profiles_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game_catalog" ("game_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companion_profiles_verified_tier_id_fkey" FOREIGN KEY ("verified_tier_id") REFERENCES "skill_rank_tier" ("tier_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_companion_profiles" ("audio_bio_url", "availability", "created_at", "game_account_id", "game_id", "hourly_rate", "max_hours_per_day", "profile_id", "profile_status", "trust_score", "user_id", "verification_status", "verified_tier_id")
SELECT "audio_bio_url", "availability", "created_at", "game_account_id", "game_id", "hourly_rate", "max_hours_per_day", "profile_id", 'ACTIVE', "trust_score", "user_id", "verification_status", "verified_tier_id" FROM "companion_profiles";
DROP TABLE "companion_profiles";
ALTER TABLE "new_companion_profiles" RENAME TO "companion_profiles";
CREATE UNIQUE INDEX "companion_profiles_user_id_key" ON "companion_profiles"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
