CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "Document" ADD COLUMN "userId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "userId" TEXT;
ALTER TABLE "Question" ADD COLUMN "userId" TEXT;
ALTER TABLE "Bookmark" ADD COLUMN "userId" TEXT;
ALTER TABLE "TopicProgress" ADD COLUMN "userId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "userId" TEXT;

DROP INDEX IF EXISTS "Bookmark_questionId_key";
DROP INDEX IF EXISTS "TopicProgress_topic_stepName_key";
DROP INDEX IF EXISTS "Document_fileHash_key";

CREATE INDEX "Document_userId_idx" ON "Document"("userId");
CREATE UNIQUE INDEX "Document_userId_fileHash_key" ON "Document"("userId", "fileHash");
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");
CREATE INDEX "Question_userId_idx" ON "Question"("userId");
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");
CREATE UNIQUE INDEX "Bookmark_userId_questionId_key" ON "Bookmark"("userId", "questionId");
CREATE INDEX "TopicProgress_userId_idx" ON "TopicProgress"("userId");
CREATE UNIQUE INDEX "TopicProgress_userId_topic_stepName_key" ON "TopicProgress"("userId", "topic", "stepName");
CREATE INDEX "InterviewSession_userId_idx" ON "InterviewSession"("userId");

ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
