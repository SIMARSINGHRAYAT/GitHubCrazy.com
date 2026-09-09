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
      `CREATE INDEX IF NOT EXISTS "DailyFollowLimit_date_idx" ON "DailyFollowLimit"("date")`
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
