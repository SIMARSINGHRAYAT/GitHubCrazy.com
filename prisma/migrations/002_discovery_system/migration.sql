CREATE TABLE "DiscoveryRepositorySubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "githubRepoId" TEXT NOT NULL,
  "repositoryName" TEXT NOT NULL,
  "repositoryOwner" TEXT NOT NULL,
  "repositoryUrl" TEXT NOT NULL,
  "repositoryAvatar" TEXT,
  "githubStars" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "discoveryStars" INTEGER NOT NULL DEFAULT 0,
  "exposureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscoveryRepositorySubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscoveryRepositoryInteraction" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscoveryRepositoryInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscoveryProfileInteraction" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscoveryProfileInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyDiscoveryUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "starsUsed" INTEGER NOT NULL DEFAULT 0,
  "followsUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyDiscoveryUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscoveryRepositorySubmission_userId_githubRepoId_key" ON "DiscoveryRepositorySubmission"("userId", "githubRepoId");
CREATE INDEX "DiscoveryRepositorySubmission_status_createdAt_idx" ON "DiscoveryRepositorySubmission"("status", "createdAt");
CREATE INDEX "DiscoveryRepositorySubmission_discoveryStars_idx" ON "DiscoveryRepositorySubmission"("discoveryStars");
CREATE UNIQUE INDEX "DiscoveryRepositoryInteraction_actorId_submissionId_key" ON "DiscoveryRepositoryInteraction"("actorId", "submissionId");
CREATE INDEX "DiscoveryRepositoryInteraction_submissionId_action_idx" ON "DiscoveryRepositoryInteraction"("submissionId", "action");
CREATE UNIQUE INDEX "DiscoveryProfileInteraction_actorId_targetId_key" ON "DiscoveryProfileInteraction"("actorId", "targetId");
CREATE INDEX "DiscoveryProfileInteraction_targetId_action_idx" ON "DiscoveryProfileInteraction"("targetId", "action");
CREATE UNIQUE INDEX "DailyDiscoveryUsage_userId_date_key" ON "DailyDiscoveryUsage"("userId", "date");
CREATE INDEX "DailyDiscoveryUsage_date_idx" ON "DailyDiscoveryUsage"("date");

ALTER TABLE "DiscoveryRepositorySubmission" ADD CONSTRAINT "DiscoveryRepositorySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscoveryRepositoryInteraction" ADD CONSTRAINT "DiscoveryRepositoryInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscoveryRepositoryInteraction" ADD CONSTRAINT "DiscoveryRepositoryInteraction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DiscoveryRepositorySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscoveryProfileInteraction" ADD CONSTRAINT "DiscoveryProfileInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscoveryProfileInteraction" ADD CONSTRAINT "DiscoveryProfileInteraction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyDiscoveryUsage" ADD CONSTRAINT "DailyDiscoveryUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
