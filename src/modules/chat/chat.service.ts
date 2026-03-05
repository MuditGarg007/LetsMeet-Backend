import { eq, desc, lt, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { chatMessages, users } from '../../shared/db/schema.js';
import type { ChatQuery } from './chat.schema.js';

export async function getMessages(meetingId: string, query: ChatQuery) {
  const conditions = [eq(chatMessages.meetingId, meetingId)];
  if (query.cursor) {
    conditions.push(lt(chatMessages.id, query.cursor));
  }

  const messages = await db.select({
    id: chatMessages.id,
    meetingId: chatMessages.meetingId,
    senderId: chatMessages.senderId,
    content: chatMessages.content,
    createdAt: chatMessages.createdAt,
    senderName: users.displayName,
    senderAvatar: users.avatarUrl,
  })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(query.limit + 1);

  const hasMore = messages.length > query.limit;
  const result = hasMore ? messages.slice(0, -1) : messages;
  const nextCursor = hasMore ? result[result.length - 1].id : null;

  return { messages: result, nextCursor };
}

export async function saveMessage(meetingId: string, senderId: string, content: string) {
  const [message] = await db.insert(chatMessages).values({
    meetingId,
    senderId,
    content,
  }).returning();

  const [sender] = await db.select({
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
  }).from(users).where(eq(users.id, senderId));

  return {
    ...message,
    senderName: sender.displayName,
    senderAvatar: sender.avatarUrl,
  };
}
