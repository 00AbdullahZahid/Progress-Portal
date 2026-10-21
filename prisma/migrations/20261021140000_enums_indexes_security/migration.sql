-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'doing', 'done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'med', 'high');

-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('group', 'project');

-- AlterTable: Channel.kind (preserve existing values)
ALTER TABLE "Channel" ADD COLUMN "kind_new" "ChannelKind" NOT NULL DEFAULT 'group';
UPDATE "Channel" SET "kind_new" = CASE WHEN "kind" = 'project' THEN 'project'::"ChannelKind" ELSE 'group'::"ChannelKind" END;
ALTER TABLE "Channel" DROP COLUMN "kind";
ALTER TABLE "Channel" RENAME COLUMN "kind_new" TO "kind";

-- AlterTable: Task.status / Task.priority (preserve existing values)
ALTER TABLE "Task" ADD COLUMN "status_new" "TaskStatus" NOT NULL DEFAULT 'todo';
ALTER TABLE "Task" ADD COLUMN "priority_new" "TaskPriority" NOT NULL DEFAULT 'med';
UPDATE "Task" SET "status_new" = CASE
  WHEN "status" = 'doing' THEN 'doing'::"TaskStatus"
  WHEN "status" = 'done' THEN 'done'::"TaskStatus"
  ELSE 'todo'::"TaskStatus" END;
UPDATE "Task" SET "priority_new" = CASE
  WHEN "priority" = 'low' THEN 'low'::"TaskPriority"
  WHEN "priority" = 'high' THEN 'high'::"TaskPriority"
  ELSE 'med'::"TaskPriority" END;
ALTER TABLE "Task" DROP COLUMN "status";
ALTER TABLE "Task" DROP COLUMN "priority";
ALTER TABLE "Task" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Task" RENAME COLUMN "priority_new" TO "priority";

-- AlterTable: User.isActive / tokenVersion / role
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "role_new" "Role" NOT NULL DEFAULT 'member';
UPDATE "User" SET "role_new" = CASE WHEN "role" = 'admin' THEN 'admin'::"Role" ELSE 'member'::"Role" END;
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "User" ALTER COLUMN "color" SET DEFAULT '#2563eb';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "Channel_projectId_idx" ON "Channel"("projectId");

-- CreateIndex
CREATE INDEX "Goal_projectId_idx" ON "Goal"("projectId");

-- CreateIndex
CREATE INDEX "HabitCheckIn_date_idx" ON "HabitCheckIn"("date");

-- CreateIndex
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "StudySession_userId_date_idx" ON "StudySession"("userId", "date");

-- CreateIndex
CREATE INDEX "Task_status_completedAt_idx" ON "Task"("status", "completedAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
