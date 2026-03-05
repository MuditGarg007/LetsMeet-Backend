import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users } from '../../shared/db/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { UpdateProfileInput } from './users.schema.js';

const publicFields = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  createdAt: users.createdAt,
};

export async function getProfile(userId: string) {
  const [user] = await db.select(publicFields).from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.displayName !== undefined) updateData.displayName = input.displayName;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

  const [user] = await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning(publicFields);

  if (!user) throw new NotFoundError('User not found');
  return user;
}
