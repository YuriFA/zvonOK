-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "guestId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Message_guestId_idx" ON "Message"("guestId");
