/**
 * Database setup helper - Run this once after deployment
 * 
 * On Vercel:
 * 1. Make sure DATABASE_URL is set in Production environment
 * 2. Run: curl -X GET https://yourdomain.com/api/setup-db
 * 3. You should see "Tables created" or "Tables already exist"
 * 4. Delete this file after successful setup
 */

import prisma from './db.js';
import type { ApiRequest, ApiResponse } from './types.js';

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // Security: Only allow GET in development or preview
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.query.secret as string;
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "githubId" INTEGER NOT NULL,
        "githubUsername" TEXT NOT NULL,
        "githubName" TEXT,
        "githubAvatar" TEXT,
        "githubBio" TEXT,
        "githubFollowersCount" INTEGER NOT NULL DEFAULT 0,
        "githubFollowingCount" INTEGER NOT NULL DEFAULT 0,
        "repositoryStarred" BOOLEAN NOT NULL DEFAULT false,
        "maintainerFollowed" BOOLEAN NOT NULL DEFAULT false,
        "lastRequirementCheck" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_githubId_key" ON "User"("githubId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_githubUsername_key" ON "User"("githubUsername")`,
      `CREATE INDEX IF NOT EXISTS "User_githubId_idx" ON "User"("githubId")`,
      `CREATE INDEX IF NOT EXISTS "User_githubUsername_idx" ON "User"("githubUsername")`,

      `CREATE TABLE IF NOT EXISTS "Follows" (
        "id" TEXT NOT NULL,
        "followerId" TEXT NOT NULL,
        "followingId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Follows_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Follows_followerId_followingId_key" ON "Follows"("followerId", "followingId")`,
      `CREATE INDEX IF NOT EXISTS "Follows_followerId_idx" ON "Follows"("followerId")`,
      `CREATE INDEX IF NOT EXISTS "Follows_followingId_idx" ON "Follows"("followingId")`,

      `CREATE TABLE IF NOT EXISTS "DailyFollowLimit" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "DailyFollowLimit_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DailyFollowLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "DailyFollowLimit_userId_date_key" ON "DailyFollowLimit"("userId", "date")`,
      `CREATE INDEX IF NOT EXISTS "DailyFollowLimit_userId_idx" ON "DailyFollowLimit"("userId")`,
      `CREATE INDEX IF NOT EXISTS "DailyFollowLimit_date_idx" ON "DailyFollowLimit"("date")`,

      `CREATE TABLE IF NOT EXISTS "DiscoveryRepositorySubmission" (
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
        CONSTRAINT "DiscoveryRepositorySubmission_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DiscoveryRepositorySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "DiscoveryRepositorySubmission_userId_githubRepoId_key" ON "DiscoveryRepositorySubmission"("userId", "githubRepoId")`,
      `CREATE INDEX IF NOT EXISTS "DiscoveryRepositorySubmission_status_createdAt_idx" ON "DiscoveryRepositorySubmission"("status", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "DiscoveryRepositorySubmission_discoveryStars_idx" ON "DiscoveryRepositorySubmission"("discoveryStars")`,

      `CREATE TABLE IF NOT EXISTS "DiscoveryRepositoryInteraction" (
        "id" TEXT NOT NULL,
        "actorId" TEXT NOT NULL,
        "submissionId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DiscoveryRepositoryInteraction_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DiscoveryRepositoryInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "DiscoveryRepositoryInteraction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DiscoveryRepositorySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "DiscoveryRepositoryInteraction_actorId_submissionId_key" ON "DiscoveryRepositoryInteraction"("actorId", "submissionId")`,
      `CREATE INDEX IF NOT EXISTS "DiscoveryRepositoryInteraction_submissionId_action_idx" ON "DiscoveryRepositoryInteraction"("submissionId", "action")`,

      `CREATE TABLE IF NOT EXISTS "DiscoveryProfileInteraction" (
        "id" TEXT NOT NULL,
        "actorId" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DiscoveryProfileInteraction_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DiscoveryProfileInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "DiscoveryProfileInteraction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "DiscoveryProfileInteraction_actorId_targetId_key" ON "DiscoveryProfileInteraction"("actorId", "targetId")`,
      `CREATE INDEX IF NOT EXISTS "DiscoveryProfileInteraction_targetId_action_idx" ON "DiscoveryProfileInteraction"("targetId", "action")`,

      `CREATE TABLE IF NOT EXISTS "DailyDiscoveryUsage" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "starsUsed" INTEGER NOT NULL DEFAULT 0,
        "followsUsed" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "DailyDiscoveryUsage_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DailyDiscoveryUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "DailyDiscoveryUsage_userId_date_key" ON "DailyDiscoveryUsage"("userId", "date")`,
      `CREATE INDEX IF NOT EXISTS "DailyDiscoveryUsage_date_idx" ON "DailyDiscoveryUsage"("date")`
    ];

    for (const statement of schemaStatements) {
      await prisma.$executeRawUnsafe(statement);
    }

    await prisma.user.findFirst({ take: 1 });
    
    return res.status(200).json({
      success: true,
      message: 'Database tables already exist and are accessible!',
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_URL?.split('@')[1] || 'unknown'
    });
  } catch (error: any) {
    // If tables don't exist yet, Prisma will throw an error
    console.error('Database connection error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Database tables do not exist yet',
      hint: 'Run: npx prisma db push --skip-generate',
      message: error.message
    });
  }
}
