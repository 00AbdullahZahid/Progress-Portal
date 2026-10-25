-- Standalone tasks: a task can exist without being attached to a project.
ALTER TABLE "Task" ALTER COLUMN "projectId" DROP NOT NULL;
