-- IBAN-Erfassung und Barbezug-Option (Auszahlung statt Helferstunden) entfallen.
ALTER TABLE "Member" DROP COLUMN "iban";
ALTER TABLE "Signup" DROP COLUMN "ibanSnapshot";
ALTER TABLE "Signup" DROP COLUMN "payoutType";
ALTER TABLE "Activity" DROP COLUMN "requiresPayoutChoice";
ALTER TABLE "AgeGroup" DROP COLUMN "triggersBarbezugChoice";
DROP TYPE "SignupPayoutType";
