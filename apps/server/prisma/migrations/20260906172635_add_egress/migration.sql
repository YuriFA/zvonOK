/*
  Warnings:

  - You are about to drop the column `lastActivityAt` on the `Room` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EgressStatus" AS ENUM ('starting', 'live', 'stopping', 'ended', 'failed');

-- CreateEnum
CREATE TYPE "EgressEndedReason" AS ENUM ('stopped', 'roomEnded');

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "lastActivityAt";

-- CreateTable
CREATE TABLE "Egress" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "outputs" JSONB NOT NULL,
    "status" "EgressStatus" NOT NULL DEFAULT 'starting',
    "endedReason" "EgressEndedReason",
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Egress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Egress_roomId_idx" ON "Egress"("roomId");

-- CreateIndex
CREATE INDEX "Egress_projectId_idx" ON "Egress"("projectId");

-- AddForeignKey
ALTER TABLE "Egress" ADD CONSTRAINT "Egress_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Egress" ADD CONSTRAINT "Egress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
