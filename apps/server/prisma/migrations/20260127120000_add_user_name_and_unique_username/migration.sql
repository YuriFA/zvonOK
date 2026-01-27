-- Add name with safe default for existing rows
ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;

-- Ensure usernames are unique
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
