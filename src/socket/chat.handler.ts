import type { Server, Socket } from 'socket.io';
import { saveMessage } from '../modules/chat/chat.service.js';
import { logger } from '../config/logger.js';

export function registerChatHandlers(io: Server, socket: Socket, userId: string, meetingId: string) {
  socket.on('chat:send', async (data: { content: string }, callback?: (res: unknown) => void) => {
    try {
      if (!data.content || typeof data.content !== 'string') {
        socket.emit('error', { message: 'Invalid message content' });
        return;
      }

      const content = data.content.trim();
      if (content.length === 0 || content.length > 2000) {
        socket.emit('error', { message: 'Message must be 1-2000 characters' });
        return;
      }

      const message = await saveMessage(meetingId, userId, content);
      io.to(meetingId).emit('chat:new-message', { message });

      if (callback) callback({ success: true });
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error sending chat message');
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
}
