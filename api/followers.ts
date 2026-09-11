import prisma from './db.js';
import { Prisma } from '@prisma/client';
import type { ApiRequest, ApiResponse } from './types.js';

const MAX_FOLLOWS_PER_DAY = 10;

function today() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function getUser(token: string) {
  const response = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
  if (!response.ok) return null;
  const githubUser = await response.json();
  return prisma.user.findUnique({ where: { githubId: githubUser.id } });
}

async function payload(currentUserId: string) {
  const date = today();
  const usage = await prisma.dailyDiscoveryUsage.findUnique({ where: { userId_date: { userId: currentUserId, date } } });
  const interactions = await prisma.discoveryProfileInteraction.findMany({ where: { actorId: currentUserId } });
  const existingFollows = await prisma.follows.findMany({ where: { followerId: currentUserId }, select: { followingId: true } });
  const unavailableProfileIds = [...new Set([...interactions.map(item => item.targetId), ...existingFollows.map(item => item.followingId)])];
  const profiles = await prisma.user.findMany({ where: { AND: [{ id: { not: currentUserId } }, { id: { notIn: unavailableProfileIds } }] }, include: { followers: { select: { followerId: true } } }, orderBy: { createdAt: 'desc' }, take: 25 });
  const followerCounts = await prisma.discoveryProfileInteraction.groupBy({ by: ['targetId'], where: { action: 'FOLLOW' }, _count: { actorId: true }, orderBy: { _count: { actorId: 'desc' } }, take: 10 });
  const followingCounts = await prisma.discoveryProfileInteraction.groupBy({ by: ['actorId'], where: { action: 'FOLLOW' }, _count: { targetId: true }, orderBy: { _count: { targetId: 'desc' } }, take: 10 });
  const leaderboardIds = [...new Set([...followerCounts.map(item => item.followingId), ...followingCounts.map(item => item.followerId)])];
  const users = await prisma.user.findMany({ where: { id: { in: leaderboardIds } } });
  const userMap = new Map(users.map(user => [user.id, user]));
  return {
    profiles: profiles.map(profile => ({ id: profile.id, username: profile.githubUsername, name: profile.githubName, avatarUrl: profile.githubAvatar, bio: profile.githubBio, profileUrl: `https://github.com/${profile.githubUsername}`, followersCount: profile.followers.length })),
    followsUsed: usage?.followsUsed || 0,
    followsRemaining: Math.max(0, MAX_FOLLOWS_PER_DAY - (usage?.followsUsed || 0)),
    maxFollowsPerDay: MAX_FOLLOWS_PER_DAY,
    receivedLeaderboard: followerCounts.map(item => ({ username: userMap.get(item.targetId)?.githubUsername || 'Unknown', followersReceived: item._count.actorId })),
    activityLeaderboard: followingCounts.map(item => ({ username: userMap.get(item.actorId)?.githubUsername || 'Unknown', profilesFollowed: item._count.targetId })),
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing authorization header' });
  try {
    const currentUser = await getUser(token);
    if (!currentUser) return res.status(401).json({ error: 'Invalid GitHub token' });
    if (req.method === 'GET') return res.status(200).json(await payload(currentUser.id));
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const action = req.body?.action;
    const targetId = String(req.body?.profileId || req.body?.cardId || '');
    if (!targetId || !['follow', 'skip'].includes(action)) return res.status(400).json({ error: 'Invalid profile discovery action' });
    if (targetId === currentUser.id) return res.status(400).json({ error: 'You cannot interact with your own profile.' });
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'Profile not found' });

    const result = await prisma.$transaction(async transaction => {
      try { await transaction.discoveryProfileInteraction.create({ data: { actorId: currentUser.id, targetId, action: action === 'follow' ? 'FOLLOW' : 'SKIP' } }); }
      catch (error: any) { if (error?.code === 'P2002') throw new Error('You have already interacted with this profile.'); throw error; }
      if (action !== 'follow') return { followsUsed: (await transaction.dailyDiscoveryUsage.findUnique({ where: { userId_date: { userId: currentUser.id, date: today() } } }))?.followsUsed || 0 };
      const usage = await transaction.dailyDiscoveryUsage.findUnique({ where: { userId_date: { userId: currentUser.id, date: today() } } });
      if ((usage?.followsUsed || 0) >= MAX_FOLLOWS_PER_DAY) throw new Error("You have reached today's limit of 10 profile follows.");
      await transaction.follows.create({ data: { followerId: currentUser.id, followingId: targetId } });
      await transaction.dailyDiscoveryUsage.upsert({ where: { userId_date: { userId: currentUser.id, date: today() } }, update: { followsUsed: { increment: 1 } }, create: { userId: currentUser.id, date: today(), followsUsed: 1 } });
      return { followsUsed: (usage?.followsUsed || 0) + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.status(200).json({ success: true, ...result, followsRemaining: MAX_FOLLOWS_PER_DAY - result.followsUsed });
  } catch (error: any) {
    return res.status(error?.message?.includes('already') || error?.message?.includes('limit') ? 409 : 500).json({ error: error?.message || 'Failed to process profile discovery request' });
  }
}
