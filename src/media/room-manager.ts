import { types as mediasoupTypes } from 'mediasoup';
import { WorkerManager } from './worker-manager.js';
import { mediasoupConfig } from '../config/mediasoup.js';
import { logger } from '../config/logger.js';

interface Peer {
  userId: string;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

interface Room {
  router: mediasoupTypes.Router;
  peers: Map<string, Peer>;
}

export class RoomManager {
  private static rooms = new Map<string, Room>();

  static async getOrCreateRoom(meetingId: string): Promise<Room> {
    let room = this.rooms.get(meetingId);
    if (room) return room;

    const worker = WorkerManager.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: mediasoupConfig.router.mediaCodecs,
    });

    room = { router, peers: new Map() };
    this.rooms.set(meetingId, room);
    logger.info({ meetingId }, 'Created new mediasoup room');

    return room;
  }

  static getRoom(meetingId: string): Room | undefined {
    return this.rooms.get(meetingId);
  }

  static addPeer(meetingId: string, userId: string): Peer {
    const room = this.rooms.get(meetingId);
    if (!room) throw new Error(`Room ${meetingId} not found`);

    let peer = room.peers.get(userId);
    if (peer) return peer;

    peer = {
      userId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };
    room.peers.set(userId, peer);
    return peer;
  }

  static getPeer(meetingId: string, userId: string): Peer | undefined {
    return this.rooms.get(meetingId)?.peers.get(userId);
  }

  static async createWebRtcTransport(meetingId: string, userId: string) {
    const room = this.rooms.get(meetingId);
    if (!room) throw new Error(`Room ${meetingId} not found`);

    const transport = await room.router.createWebRtcTransport({
      listenIps: [...mediasoupConfig.webRtcTransport.listenIps],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
    });

    const peer = room.peers.get(userId);
    if (peer) {
      peer.transports.set(transport.id, transport);
    }

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  static async connectTransport(meetingId: string, userId: string, transportId: string, dtlsParameters: mediasoupTypes.DtlsParameters) {
    const peer = this.getPeer(meetingId, userId);
    const transport = peer?.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');
    await transport.connect({ dtlsParameters });
  }

  static async produce(
    meetingId: string,
    userId: string,
    transportId: string,
    kind: mediasoupTypes.MediaKind,
    rtpParameters: mediasoupTypes.RtpParameters,
    appData: Record<string, unknown> = {}
  ) {
    const peer = this.getPeer(meetingId, userId);
    const transport = peer?.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({ kind, rtpParameters, appData });

    peer!.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      producer.close();
      peer!.producers.delete(producer.id);
    });

    return producer;
  }

  static async consume(
    meetingId: string,
    userId: string,
    transportId: string,
    producerId: string
  ) {
    const room = this.rooms.get(meetingId);
    if (!room) throw new Error(`Room ${meetingId} not found`);

    const peer = room.peers.get(userId);
    const transport = peer?.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    if (!room.router.canConsume({ producerId, rtpCapabilities: room.router.rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: room.router.rtpCapabilities,
      paused: true,
    });

    peer!.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      consumer.close();
      peer!.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      consumer.close();
      peer!.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: consumer.appData,
    };
  }

  static removePeer(meetingId: string, userId: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return;

    const peer = room.peers.get(userId);
    if (!peer) return;

    for (const consumer of peer.consumers.values()) consumer.close();
    for (const producer of peer.producers.values()) producer.close();
    for (const transport of peer.transports.values()) transport.close();

    room.peers.delete(userId);

    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(meetingId);
      logger.info({ meetingId }, 'Closed empty mediasoup room');
    }
  }

  static closeRoom(meetingId: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return;

    for (const peer of room.peers.values()) {
      for (const consumer of peer.consumers.values()) consumer.close();
      for (const producer of peer.producers.values()) producer.close();
      for (const transport of peer.transports.values()) transport.close();
    }

    room.router.close();
    this.rooms.delete(meetingId);
    logger.info({ meetingId }, 'Room closed and all resources released');
  }

  static getProducers(meetingId: string, excludeUserId?: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return [];

    const producers: Array<{ producerId: string; userId: string; kind: string; appData: Record<string, unknown> }> = [];
    for (const [userId, peer] of room.peers) {
      if (userId === excludeUserId) continue;
      for (const producer of peer.producers.values()) {
        producers.push({
          producerId: producer.id,
          userId,
          kind: producer.kind,
          appData: producer.appData as Record<string, unknown>,
        });
      }
    }
    return producers;
  }
}
