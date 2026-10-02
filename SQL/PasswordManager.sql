DROP TABLE IF EXISTS "Credentials";
DROP TABLE IF EXISTS "Categories";
DROP TABLE IF EXISTS "UserSettings";
DROP TABLE IF EXISTS "RecoveryCodes";
DROP TABLE IF EXISTS "Profiles";
DROP TABLE IF EXISTS "User";

CREATE TABLE "User" (
  "RecordId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar UNIQUE NOT NULL,
  "KdfAlgorithm" varchar NOT NULL,
  "KdfSalt" varchar NOT NULL,
  "KdfMemoryKib" int NOT NULL,
  "KdfIterations" int NOT NULL,
  "KdfParallelism" int NOT NULL,
  "AuthVerifier" varchar,
  "AuthChallenge" varchar,
  "AuthChallengeExpiresAt" timestamp,

  "TotpSecretProtected" varchar,
  "TotpEnabledAt" timestamp,

  "EmailVerified" boolean NOT NULL DEFAULT false,
  "EmailVerificationToken" varchar,
  "EmailVerificationExpiresAt" timestamp,

  "WrappedDataKey" varchar,
  "WrappedDataKeyIv" varchar,
  "LastLoginAt" timestamp,
  "FailedLoginAttempts" int NOT NULL DEFAULT 0,
  "LockoutUntil" timestamp,
  "UpdatedAt" timestamp NOT NULL,
  "CreatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "Profiles" (
  "RecordId" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "UserRecordId" uuid NOT NULL,
  "displayName" varchar NOT NULL,
  "Color" varchar not null
);

CREATE TABLE "Categories" (
  "RecordId" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "UserRecordId" uuid NOT NULL,
  "name" varchar NOT NULL,
  "iv" varchar NOT NULL,
  "SortOrder" bigint NOT NULL DEFAULT 0
);

CREATE TABLE "Credentials" (
  "RecordId" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "UserRecordId" uuid NOT NULL,
  "Ciphertext" varchar NOT NULL,  -- { username, password, website, notes } encrypted
  "Iv" varchar NOT NULL,
  "favourite" boolean NOT NULL DEFAULT false,
  "CategoryRecordId" bigint NOT NULL,
  "hideUsername" boolean NOT NULL DEFAULT false,
  "Color" varchar not null,
  "UpdatedAt" timestamp NOT NULL,
  "CreatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "RecoveryCodes" (
  "RecordId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserRecordId" uuid NOT NULL,
  "CodeHash" varchar NOT NULL,
  "Used" boolean NOT NULL DEFAULT false,
  "UsedAt" timestamp,
  "CreatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "UserSettings" (
  "UserRecordId" uuid PRIMARY KEY,
  "dark_mode" boolean NOT NULL DEFAULT false,
  "name" varchar NOT NULL,
  "auto_lock_number" int NOT NULL DEFAULT 5,
  "auto_lock" boolean NOT NULL DEFAULT true,
  "hide_credentials_default" boolean NOT NULL DEFAULT true,
  "clipboard_clean" boolean NOT NULL DEFAULT true,
  "twofa" boolean NOT NULL DEFAULT false,
  "security_alerts" boolean NOT NULL DEFAULT false
);

ALTER TABLE "Credentials" ADD FOREIGN KEY ("UserRecordId") REFERENCES "User" ("RecordId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "UserSettings" ADD FOREIGN KEY ("UserRecordId") REFERENCES "User" ("RecordId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "Credentials" ADD FOREIGN KEY ("CategoryRecordId") REFERENCES "Categories" ("RecordId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "Categories" ADD FOREIGN KEY ("UserRecordId") REFERENCES "User" ("RecordId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "Profiles" ADD FOREIGN KEY ("UserRecordId") REFERENCES "User" ("RecordId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "RecoveryCodes" ADD FOREIGN KEY ("UserRecordId") REFERENCES "User" ("RecordId") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "idx_recoverycodes_user" ON "RecoveryCodes" ("UserRecordId");