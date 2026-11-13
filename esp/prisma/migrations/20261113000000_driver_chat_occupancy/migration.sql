-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('STUDENT', 'DRIVER');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "passengerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "sender" "ChatSender" NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_busId_createdAt_idx" ON "ChatMessage"("busId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
