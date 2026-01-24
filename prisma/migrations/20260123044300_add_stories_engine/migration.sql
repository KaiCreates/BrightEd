-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectiveId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "storyElement" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "variation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "storyElement" TEXT,
    CONSTRAINT "SimulationStep_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'user',
    "objectiveId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoriesPlayerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ageBracket" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "reputation" TEXT NOT NULL,
    "bCoins" INTEGER NOT NULL DEFAULT 100,
    "timeUnits" INTEGER NOT NULL DEFAULT 100,
    "inventory" TEXT NOT NULL,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "activeConsequences" TEXT NOT NULL,
    "lastSimulatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StorySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "businessState" TEXT,
    "difficultyContext" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "StorySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StoriesPlayerProfile" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StorySession_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DecisionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StorySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "ruleId" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "appliedAt" DATETIME,
    CONSTRAINT "Consequence_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Consequence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StorySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NPC" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "NPCMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "interactions" TEXT NOT NULL,
    "lastInteractionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentiment" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "NPCMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StoriesPlayerProfile" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NPCMemory_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Question_objectiveId_idx" ON "Question"("objectiveId");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_objectiveId_key" ON "UserProgress"("userId", "objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StoriesPlayerProfile_userId_key" ON "StoriesPlayerProfile"("userId");

-- CreateIndex
CREATE INDEX "StorySession_userId_idx" ON "StorySession"("userId");

-- CreateIndex
CREATE INDEX "StorySession_storyId_idx" ON "StorySession"("storyId");

-- CreateIndex
CREATE INDEX "StorySession_state_idx" ON "StorySession"("state");

-- CreateIndex
CREATE INDEX "DecisionLog_sessionId_idx" ON "DecisionLog"("sessionId");

-- CreateIndex
CREATE INDEX "Consequence_sessionId_idx" ON "Consequence"("sessionId");

-- CreateIndex
CREATE INDEX "Consequence_scheduledAt_idx" ON "Consequence"("scheduledAt");

-- CreateIndex
CREATE INDEX "NPCMemory_npcId_idx" ON "NPCMemory"("npcId");

-- CreateIndex
CREATE UNIQUE INDEX "NPCMemory_userId_npcId_key" ON "NPCMemory"("userId", "npcId");
