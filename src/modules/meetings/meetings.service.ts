import { eq, and, desc, sql, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { meetings, participants, users } from '../../shared/db/schema.js';
import { generateMeetingCode } from '../../shared/utils/meeting-code.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../shared/errors/app-error.js';
import type { CreateMeetingInput, ListMeetingsQuery } from './meetings.schema.js';

export async function createMeeting(hostId: string, input: CreateMeetingInput) {
  const code = generateMeetingCode();

  const [meeting] = await db.insert(meetings).values({
    code,
    title: input.title || 'Untitled Meeting',
    hostId,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    maxParticipants: input.maxParticipants || 50,
    settings: input.settings || {},
  }).returning();

  return meeting;
}

export async function listMeetings(userId: string, query: ListMeetingsQuery) {
  const conditions = [eq(meetings.hostId, userId)];
  if (query.status) conditions.push(eq(meetings.status, query.status));

  const offset = (query.page - 1) * query.limit;

  const [meetingsList, [{ total }]] = await Promise.all([
    db.select().from(meetings)
      .where(and(...conditions))
      .orderBy(desc(meetings.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(meetings)
      .where(and(...conditions)),
  ]);

  return {
    meetings: meetingsList,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getMeeting(meetingId: string) {
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
  if (!meeting) throw new NotFoundError('Meeting not found');

  const meetingParticipants = await db.select({
    id: participants.id,
    userId: participants.userId,
    role: participants.role,
    joinedAt: participants.joinedAt,
    leftAt: participants.leftAt,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
  })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .where(eq(participants.meetingId, meetingId));

  return { meeting, participants: meetingParticipants };
}

export async function getMeetingByCode(code: string) {
  const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code));
  if (!meeting) throw new NotFoundError('Meeting not found');
  return meeting;
}

export async function joinMeeting(meetingId: string, userId: string) {
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
  if (!meeting) throw new NotFoundError('Meeting not found');

  if (meeting.status === 'ended') {
    throw new BadRequestError('Meeting has ended');
  }

  const activeCount = await redis.scard(`meeting:${meetingId}:participants`);
  if (activeCount >= (meeting.maxParticipants || 50)) {
    throw new BadRequestError('Meeting is full');
  }

  // Upsert participant — handles rejoin after leaving
  const existingParticipants = await db.select()
    .from(participants)
    .where(and(eq(participants.meetingId, meetingId), eq(participants.userId, userId)));

  let participant;
  const role = meeting.hostId === userId ? 'host' : 'participant';

  if (existingParticipants.length > 0) {
    [participant] = await db.update(participants)
      .set({ leftAt: null, joinedAt: new Date(), role })
      .where(eq(participants.id, existingParticipants[0].id))
      .returning();
  } else {
    [participant] = await db.insert(participants).values({
      meetingId,
      userId,
      role,
    }).returning();
  }

  // Update meeting status to active if it was waiting
  if (meeting.status === 'waiting') {
    await db.update(meetings)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(meetings.id, meetingId));
  }

  // Track active participants in Redis
  await redis.sadd(`meeting:${meetingId}:participants`, userId);
  await redis.set(`user:${userId}:meeting`, meetingId);

  // Generate a short-lived socket token for WebSocket auth
  const socketToken = uuidv4();
  await redis.set(`socket:token:${socketToken}`, JSON.stringify({ userId, meetingId }), 'EX', 60);

  return { participant, socketToken };
}

export async function leaveMeeting(meetingId: string, userId: string) {
  await db.update(participants)
    .set({ leftAt: new Date() })
    .where(and(eq(participants.meetingId, meetingId), eq(participants.userId, userId)));

  await redis.srem(`meeting:${meetingId}:participants`, userId);
  await redis.del(`user:${userId}:meeting`);
}

export async function endMeeting(meetingId: string, userId: string) {
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
  if (!meeting) throw new NotFoundError('Meeting not found');
  if (meeting.hostId !== userId) throw new ForbiddenError('Only the host can end a meeting');
  if (meeting.status === 'ended') throw new BadRequestError('Meeting already ended');

  await db.update(meetings)
    .set({ status: 'ended', endedAt: new Date(), updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  // Mark all active participants as left
  await db.update(participants)
    .set({ leftAt: new Date() })
    .where(and(eq(participants.meetingId, meetingId), sql`${participants.leftAt} IS NULL`));

  // Clean up Redis
  const activeUsers = await redis.smembers(`meeting:${meetingId}:participants`);
  if (activeUsers.length > 0) {
    const pipeline = redis.pipeline();
    for (const uid of activeUsers) {
      pipeline.del(`user:${uid}:meeting`);
    }
    pipeline.del(`meeting:${meetingId}:participants`);
    await pipeline.exec();
  }

  return activeUsers;
}
