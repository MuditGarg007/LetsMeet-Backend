import type { Server, Socket } from 'socket.io';
import { RoomManager } from '../media/room-manager.js';
import { logger } from '../config/logger.js';

export function registerMediaHandlers(io: Server, socket: Socket, userId: string, meetingId: string) {
  socket.on('media:get-router-capabilities', async (_, callback) => {
    try {
      const room = await RoomManager.getOrCreateRoom(meetingId);
      RoomManager.addPeer(meetingId, userId);
      callback({ routerRtpCapabilities: room.router.rtpCapabilities });
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error getting router capabilities');
      callback({ error: 'Failed to get router capabilities' });
    }
  });

  socket.on('media:create-transport', async (data: { direction: 'send' | 'recv' }, callback) => {
    try {
      const transportParams = await RoomManager.createWebRtcTransport(meetingId, userId);
      callback({ transportParams });
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error creating transport');
      callback({ error: 'Failed to create transport' });
    }
  });

  socket.on('media:connect-transport', async (data: { transportId: string; dtlsParameters: any }, callback) => {
    try {
      await RoomManager.connectTransport(meetingId, userId, data.transportId, data.dtlsParameters);
      callback({ success: true });
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error connecting transport');
      callback({ error: 'Failed to connect transport' });
    }
  });

  socket.on('media:produce', async (data: { transportId: string; kind: any; rtpParameters: any; appData?: any }, callback) => {
    try {
      const producer = await RoomManager.produce(
        meetingId, userId, data.transportId, data.kind, data.rtpParameters, data.appData || {}
      );

      socket.to(meetingId).emit('media:new-producer', {
        producerId: producer.id,
        userId,
        kind: producer.kind,
        appData: producer.appData,
      });

      callback({ producerId: producer.id });
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error producing');
      callback({ error: 'Failed to produce' });
    }
  });

  socket.on('media:consume', async (data: { producerId: string; transportId: string }, callback) => {
    try {
      const consumerParams = await RoomManager.consume(meetingId, userId, data.transportId, data.producerId);
      callback({ consumerParams });
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error consuming');
      callback({ error: 'Failed to consume' });
    }
  });

  socket.on('media:resume-consumer', async (data: { consumerId: string }, callback) => {
    try {
      const peer = RoomManager.getPeer(meetingId, userId);
      const consumer = peer?.consumers.get(data.consumerId);
      if (consumer) {
        await consumer.resume();
        callback({ success: true });
      } else {
        callback({ error: 'Consumer not found' });
      }
    } catch (err) {
      logger.error({ err, userId, meetingId }, 'Error resuming consumer');
      callback({ error: 'Failed to resume consumer' });
    }
  });

  socket.on('media:producer-pause', async (data: { producerId: string }, callback) => {
    try {
      const peer = RoomManager.getPeer(meetingId, userId);
      const producer = peer?.producers.get(data.producerId);
      if (producer) {
        await producer.pause();
        socket.to(meetingId).emit('media:producer-paused', { producerId: data.producerId, userId });
        callback({ success: true });
      } else {
        callback({ error: 'Producer not found' });
      }
    } catch (err) {
      logger.error({ err }, 'Error pausing producer');
      callback({ error: 'Failed to pause producer' });
    }
  });

  socket.on('media:producer-resume', async (data: { producerId: string }, callback) => {
    try {
      const peer = RoomManager.getPeer(meetingId, userId);
      const producer = peer?.producers.get(data.producerId);
      if (producer) {
        await producer.resume();
        socket.to(meetingId).emit('media:producer-resumed', { producerId: data.producerId, userId });
        callback({ success: true });
      } else {
        callback({ error: 'Producer not found' });
      }
    } catch (err) {
      logger.error({ err }, 'Error resuming producer');
      callback({ error: 'Failed to resume producer' });
    }
  });

  socket.on('media:producer-close', async (data: { producerId: string }, callback) => {
    try {
      const peer = RoomManager.getPeer(meetingId, userId);
      const producer = peer?.producers.get(data.producerId);
      if (producer) {
        producer.close();
        peer!.producers.delete(data.producerId);
        socket.to(meetingId).emit('media:producer-closed', { producerId: data.producerId, userId });
        callback({ success: true });
      } else {
        callback({ error: 'Producer not found' });
      }
    } catch (err) {
      logger.error({ err }, 'Error closing producer');
      callback({ error: 'Failed to close producer' });
    }
  });

  socket.on('media:get-producers', async (_, callback) => {
    try {
      const producers = RoomManager.getProducers(meetingId, userId);
      callback({ producers });
    } catch (err) {
      logger.error({ err }, 'Error getting producers');
      callback({ error: 'Failed to get producers' });
    }
  });

  socket.on('screen:share-start', async (data: { transportId: string; rtpParameters: any }, callback) => {
    try {
      const producer = await RoomManager.produce(
        meetingId, userId, data.transportId, 'video', data.rtpParameters, { type: 'screen' }
      );

      socket.to(meetingId).emit('media:new-producer', {
        producerId: producer.id,
        userId,
        kind: 'video',
        appData: { type: 'screen' },
      });

      callback({ producerId: producer.id });
    } catch (err) {
      logger.error({ err }, 'Error starting screen share');
      callback({ error: 'Failed to start screen share' });
    }
  });

  socket.on('screen:share-stop', async (data: { producerId: string }, callback) => {
    try {
      const peer = RoomManager.getPeer(meetingId, userId);
      const producer = peer?.producers.get(data.producerId);
      if (producer) {
        producer.close();
        peer!.producers.delete(data.producerId);
        socket.to(meetingId).emit('media:producer-closed', { producerId: data.producerId, userId });
        callback({ success: true });
      } else {
        callback({ error: 'Producer not found' });
      }
    } catch (err) {
      logger.error({ err }, 'Error stopping screen share');
      callback({ error: 'Failed to stop screen share' });
    }
  });
}
