import type { Server, Socket } from 'socket.io';
import { RoomManager } from '../media/room-manager.js';
import { leaveMeeting, endMeeting } from '../modules/meetings/meetings.service.js';
import { logger } from '../config/logger.js';

export function registerMeetingHandlers(io: Server, socket: Socket, userId: string, meetingId: string) {
  socket.on('meeting:leave', async () => {
    try {
      RoomManager.removePeer(meetingId, userId);
      await leaveMeeting(meetingId, userId);
      socket.to(meetingId).emit('meeting:user-left', { userId });
      socket.leave(meetingId);
      logger.info({ userId, meetingId }, 'User left meeting');
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error leaving meeting');
      socket.emit('error', { message: 'Failed to leave meeting' });
    }
  });

  socket.on('meeting:end', async () => {
    try {
      await endMeeting(meetingId, userId);
      RoomManager.closeRoom(meetingId);
      io.to(meetingId).emit('meeting:ended');
      logger.info({ userId, meetingId }, 'Meeting ended by host');
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error ending meeting');
      socket.emit('error', { message: 'Failed to end meeting' });
    }
  });

  socket.on('disconnect', async () => {
    try {
      RoomManager.removePeer(meetingId, userId);
      await leaveMeeting(meetingId, userId);
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error on disconnect cleanup');
    }
  });
}
