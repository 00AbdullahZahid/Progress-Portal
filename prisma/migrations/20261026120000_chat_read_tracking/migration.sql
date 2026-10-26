-- Track when a member last opened Chat so the mobile bottom nav can show an
-- unread badge without marking anything read on their behalf.
ALTER TABLE "User" ADD COLUMN "chatReadAt" TIMESTAMP(3);
