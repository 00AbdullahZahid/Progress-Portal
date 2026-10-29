-- CreateEnum
CREATE TYPE "TimetableScope" AS ENUM ('group', 'personal');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "TimetableEntry" ADD COLUMN     "scope" "TimetableScope" NOT NULL DEFAULT 'group';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gpaScale" JSONB;

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "TimetableEntry_scope_weekday_idx" ON "TimetableEntry"("scope", "weekday");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
