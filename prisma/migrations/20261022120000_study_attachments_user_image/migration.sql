-- AlterTable
ALTER TABLE "User" ADD COLUMN "image" TEXT;

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN "image" TEXT,
ADD COLUMN "fileUrl" TEXT,
ADD COLUMN "fileName" TEXT,
ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT false;
