-- Add deterministic SHA-256 lookup column to PasswordResetToken.
-- This enables O(1) token lookup instead of scanning all active tokens.
-- Nullable so existing rows (30-minute TTL, effectively zero in practice at deploy time)
-- remain valid through the bcrypt fallback in resetPassword.

ALTER TABLE "PasswordResetToken" ADD COLUMN "tokenLookupHash" TEXT;

CREATE UNIQUE INDEX "PasswordResetToken_tokenLookupHash_key" ON "PasswordResetToken"("tokenLookupHash");
