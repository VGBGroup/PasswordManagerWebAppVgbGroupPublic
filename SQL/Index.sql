CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_Credentials_UserRecordId" ON "Credentials" ("UserRecordId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_Categories_UserRecordId" ON "Categories" ("UserRecordId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_Subscriptions_UserRecordId" ON "Subscriptions" ("UserRecordId");