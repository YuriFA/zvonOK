-- AlterTable
ALTER TABLE "Egress" ADD COLUMN "recordingFinalizedAt" TIMESTAMP(3),
ADD COLUMN "recordingSizeBytes" BIGINT;
