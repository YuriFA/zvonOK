-- Link a developer account to the app user that created it via SSO.
-- Nullable and unique: externally registered developer accounts stay
-- unlinked, and each app user owns at most one linked account.

-- AlterTable
ALTER TABLE "DeveloperAccount" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperAccount_userId_key" ON "DeveloperAccount"("userId");

-- AddForeignKey
ALTER TABLE "DeveloperAccount" ADD CONSTRAINT "DeveloperAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
