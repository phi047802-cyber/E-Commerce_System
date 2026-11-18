-- AlterTable
ALTER TABLE "payments" ADD COLUMN "expires_at" DATETIME;
ALTER TABLE "payments" ADD COLUMN "qr_url" TEXT;
ALTER TABLE "payments" ADD COLUMN "sepay_id" TEXT;
