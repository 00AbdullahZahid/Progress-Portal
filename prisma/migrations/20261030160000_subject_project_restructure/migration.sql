-- Restructure: Project -> Subject, Goal -> Project.
-- This is intentionally handwritten: Prisma would otherwise drop and recreate
-- the tables, losing all tasks, goals, and chat links.

-- Channel kinds now describe course channels.
ALTER TYPE "ChannelKind" RENAME VALUE 'project' TO 'subject';

-- Rename the tables. Existing rows keep their ids, so every foreign key and
-- every task/timetable reference survives untouched.
ALTER TABLE "Project" RENAME TO "Subject";
ALTER TABLE "Goal" RENAME TO "Project";

-- Primary keys keep their old names after a table rename. Rename Subject's
-- first so the Goal key can take the Project_ prefix without a collision.
ALTER TABLE "Subject" RENAME CONSTRAINT "Project_pkey" TO "Subject_pkey";
ALTER TABLE "Project" RENAME CONSTRAINT "Goal_pkey" TO "Project_pkey";

-- Goal.projectId -> Project.subjectId
ALTER TABLE "Project" RENAME COLUMN "projectId" TO "subjectId";
ALTER TABLE "Project" RENAME CONSTRAINT "Goal_projectId_fkey" TO "Project_subjectId_fkey";
ALTER INDEX "Goal_projectId_idx" RENAME TO "Project_subjectId_idx";

-- Task.projectId -> Task.subjectId, Task.goalId -> Task.projectId
ALTER TABLE "Task" RENAME COLUMN "projectId" TO "subjectId";
ALTER TABLE "Task" RENAME COLUMN "goalId" TO "projectId";
ALTER TABLE "Task" RENAME CONSTRAINT "Task_projectId_fkey" TO "Task_subjectId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "Task_goalId_fkey" TO "Task_projectId_fkey";
ALTER INDEX "Task_projectId_idx" RENAME TO "Task_subjectId_idx";
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- Channel.projectId -> Channel.subjectId
ALTER TABLE "Channel" RENAME COLUMN "projectId" TO "subjectId";
ALTER TABLE "Channel" RENAME CONSTRAINT "Channel_projectId_fkey" TO "Channel_subjectId_fkey";
ALTER INDEX "Channel_projectId_idx" RENAME TO "Channel_subjectId_idx";

-- Subject metadata.
ALTER TABLE "Subject"
  ADD COLUMN "color" TEXT NOT NULL DEFAULT '#2563eb',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Deadlines gain optional subject/project links.
ALTER TABLE "Exam"
  ADD COLUMN "subjectId" TEXT,
  ADD COLUMN "projectId" TEXT;

-- Shared subject links for the rest of the library.
ALTER TABLE "Note" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "Flashcard" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "Question" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "StudySession" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "TimetableEntry" ADD COLUMN "subjectId" TEXT;

-- Foreign keys.
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for the new links.
CREATE INDEX "Exam_subjectId_idx" ON "Exam"("subjectId");
CREATE INDEX "Exam_projectId_idx" ON "Exam"("projectId");
CREATE INDEX "Note_subjectId_idx" ON "Note"("subjectId");
CREATE INDEX "Resource_subjectId_idx" ON "Resource"("subjectId");
CREATE INDEX "Flashcard_subjectId_idx" ON "Flashcard"("subjectId");
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");
CREATE INDEX "StudySession_subjectId_idx" ON "StudySession"("subjectId");
CREATE INDEX "TimetableEntry_subjectId_idx" ON "TimetableEntry"("subjectId");

-- Backfill: create a Subject for every distinct free-text subject that does not
-- already match an existing subject name (case-insensitive, trimmed).
WITH all_names AS (
  SELECT btrim("subject") AS name FROM "Note"
  UNION ALL
  SELECT btrim("subject") AS name FROM "Resource"
  UNION ALL
  SELECT btrim("subject") AS name FROM "Exam"
  UNION ALL
  SELECT btrim("subject") AS name FROM "Question"
  UNION ALL
  SELECT btrim("subject") AS name FROM "StudySession"
),
names AS (
  SELECT DISTINCT ON (lower(name)) name
  FROM all_names
  WHERE name <> ''
  ORDER BY lower(name), name
)
INSERT INTO "Subject" ("id", "name", "color", "createdAt")
SELECT 'sub_' || md5(lower(name)), name, '#2563eb', NOW()
FROM names n
WHERE NOT EXISTS (
  SELECT 1 FROM "Subject" s WHERE lower(btrim(s."name")) = lower(n.name)
);

-- Link each row to the matching Subject without disturbing existing ids.
UPDATE "Note" t SET "subjectId" = (
  SELECT s."id" FROM "Subject" s
  WHERE lower(btrim(s."name")) = lower(btrim(t."subject"))
  ORDER BY s."createdAt" LIMIT 1
) WHERE t."subjectId" IS NULL AND btrim(t."subject") <> '';

UPDATE "Resource" t SET "subjectId" = (
  SELECT s."id" FROM "Subject" s
  WHERE lower(btrim(s."name")) = lower(btrim(t."subject"))
  ORDER BY s."createdAt" LIMIT 1
) WHERE t."subjectId" IS NULL AND btrim(t."subject") <> '';

UPDATE "Exam" t SET "subjectId" = (
  SELECT s."id" FROM "Subject" s
  WHERE lower(btrim(s."name")) = lower(btrim(t."subject"))
  ORDER BY s."createdAt" LIMIT 1
) WHERE t."subjectId" IS NULL AND btrim(t."subject") <> '';

UPDATE "Question" t SET "subjectId" = (
  SELECT s."id" FROM "Subject" s
  WHERE lower(btrim(s."name")) = lower(btrim(t."subject"))
  ORDER BY s."createdAt" LIMIT 1
) WHERE t."subjectId" IS NULL AND btrim(t."subject") <> '';

UPDATE "StudySession" t SET "subjectId" = (
  SELECT s."id" FROM "Subject" s
  WHERE lower(btrim(s."name")) = lower(btrim(t."subject"))
  ORDER BY s."createdAt" LIMIT 1
) WHERE t."subjectId" IS NULL AND btrim(t."subject") <> '';
