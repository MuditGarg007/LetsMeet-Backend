import type { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { registerMeetingHandlers } from './meeting.handler.js';
import { registerChatHandlers } from './chat.handler.js';
import { registerMediaHandlers } from './media.handler.js';

export interface AuthenticatedSocket {
  userId: string;
  meetingId: string;
}

let io: Server;

export function getIO(): Server {
  return io;
}

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.socketToken as string;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const data = await redis.get(`socket:token:${token}`);
      if (!data) {
        return next(new Error('Invalid or expired socket token'));
      }

      const { userId, meetingId } = JSON.parse(data);
      (socket as any).userId = userId;
      (socket as any).meetingId = meetingId;

      await redis.del(`socket:token:${token}`);
      next();
    } catch (err) {
      logger.error({ err }, 'Socket auth error');
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    const meetingId = (socket as any).meetingId as string;
    logger.info({ userId, meetingId, socketId: socket.id }, 'Socket connected');

    socket.join(meetingId);
    socket.to(meetingId).emit('meeting:user-joined', { userId, socketId: socket.id });

    registerMeetingHandlers(io, socket, userId, meetingId);
    registerChatHandlers(io, socket, userId, meetingId);
    registerMediaHandlers(io, socket, userId, meetingId);

    socket.on('disconnect', (reason) => {
      logger.info({ userId, meetingId, reason }, 'Socket disconnected');
      socket.to(meetingId).emit('meeting:user-left', { userId });
    });

    socket.on('error', (err) => {
      logger.error({ err, userId, meetingId }, 'Socket error');
    });
  });

  logger.info('Socket.IO server initialized');
}
