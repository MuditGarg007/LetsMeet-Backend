import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { users, refreshTokens } from '../../shared/db/schema.js';
import { hashPassword, verifyPassword } from '../../shared/utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors/app-error.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateTokens(userId: string, email: string) {
  const jti = uuidv4();
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId, jti });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (existing.length > 0) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db.insert(users).values({
    email: input.email,
    passwordHash,
    displayName: input.displayName,
  }).returning({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  });

  const tokens = await generateTokens(user.id, user.email);

  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  const [user] = await db.select().from(users).where(eq(users.email, input.email));

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await generateTokens(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    ...tokens,
  };
}

export async function refresh(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const tokenHash = hashToken(token);

  const blacklisted = await redis.get(`refresh:blacklist:${tokenHash}`);
  if (blacklisted) {
    throw new UnauthorizedError('Token has been revoked');
  }

  const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
  if (!stored) {
    throw new UnauthorizedError('Refresh token not found');
  }

  // Rotate: blacklist old token & delete from DB
  await redis.set(`refresh:blacklist:${tokenHash}`, '1', 'EX', 7 * 24 * 60 * 60);
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));

  const [user] = await db.select({
    id: users.id,
    email: users.email,
  }).from(users).where(eq(users.id, payload.sub));

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return generateTokens(user.id, user.email);
}

export async function logout(token: string) {
  const tokenHash = hashToken(token);
  await redis.set(`refresh:blacklist:${tokenHash}`, '1', 'EX', 7 * 24 * 60 * 60);
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
}
