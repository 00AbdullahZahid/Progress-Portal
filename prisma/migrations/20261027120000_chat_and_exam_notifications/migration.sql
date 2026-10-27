-- Chat @mentions and daily exam/deadline reminders.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'chat_mention';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'exam_due';

ALTER TABLE "User" ADD COLUMN "notifyChatMentions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyExamReminders" BOOLEAN NOT NULL DEFAULT true;
