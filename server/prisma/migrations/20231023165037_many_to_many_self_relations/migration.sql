/*
  Warnings:

  - A unique constraint covering the columns `[roomID]` on the table `UserMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserMessage" ADD COLUMN     "roomID" TEXT;

-- CreateTable
CREATE TABLE "_Friends" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Friends_AB_unique" ON "_Friends"("A", "B");

-- CreateIndex
CREATE INDEX "_Friends_B_index" ON "_Friends"("B");

-- CreateIndex
CREATE UNIQUE INDEX "UserMessage_roomID_key" ON "UserMessage"("roomID");

-- AddForeignKey
ALTER TABLE "_Friends" ADD CONSTRAINT "_Friends_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Friends" ADD CONSTRAINT "_Friends_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
