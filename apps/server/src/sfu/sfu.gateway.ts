import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SfuService } from './sfu.service';
import type {
  SfuJoinPayload,
  SfuTransportConnectPayload,
  SfuProducePayload,
  SfuConsumePayload,
  SfuResumeConsumerPayload,
  SfuKickPeerPayload,
} from './interfaces/sfu.interface';
import { OnGatewayInit } from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/sfu',
})
export class SfuGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SfuGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly sfuService: SfuService) {
    this.sfuService = sfuService;
  }

  afterInit(): void {
    this.logger.log('SFU Gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`SFU client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`SFU client disconnected: ${client.id}`);
    this.sfuService.closePeer(client);
  }

  @SubscribeMessage('sfu:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SfuJoinPayload,
  ): Promise<void> {
    this.logger.log(`SFU join request from ${client.id}`, { payload });
    await this.sfuService.joinRoom(client, payload);
  }

  @SubscribeMessage('sfu:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(`SFU leave request from ${client.id}`);
    await this.sfuService.leaveRoom(client);
  }

  @SubscribeMessage('sfu:create-send-transport')
  async handleCreateSendTransport(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(`Creating send transport for ${client.id}`);
    await this.sfuService.createSendTransport(client);
  }

  @SubscribeMessage('sfu:create-recv-transport')
  async handleCreateRecvTransport(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(`Creating recv transport for ${client.id}`);
    await this.sfuService.createRecvTransport(client);
  }

  @SubscribeMessage('sfu:connect-transport')
  async handleConnectTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SfuTransportConnectPayload,
  ): Promise<void> {
    this.logger.log(`Connecting transport ${payload.transportId} for ${client.id}`);
    await this.sfuService.connectTransport(client, payload);
  }

  @SubscribeMessage('sfu:produce')
  async handleProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SfuProducePayload,
  ): Promise<void> {
    this.logger.log(`Creating producer for ${client.id}`);
    await this.sfuService.createProducer(client, payload);
  }

  @SubscribeMessage('sfu:consume')
  async handleConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SfuConsumePayload,
  ): Promise<void> {
    this.logger.log(`Creating consumer for ${client.id}`);
    await this.sfuService.createConsumer(client, payload);
  }

  @SubscribeMessage('sfu:resume-consumer')
  async handleResumeConsumer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SfuResumeConsumerPayload,
  ): Promise<void> {
    this.logger.log(`Resuming consumer ${payload.consumerId} for ${client.id}`);
    await this.sfuService.resumeConsumer(client, payload.consumerId);
  }

  @SubscribeMessage('sfu:pause-producer')
  async handlePauseProducer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { producerId: string },
  ): Promise<void> {
    this.logger.log(`Pausing producer ${payload.producerId} for ${client.id}`);
    await this.sfuService.pauseProducer(client, payload.producerId);
  }

  @SubscribeMessage('sfu:resume-producer')
  async handleResumeProducer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { producerId: string },
  ): Promise<void> {
    this.logger.log(`Resuming producer ${payload.producerId} for ${client.id}`);
    await this.sfuService.resumeProducer(client, payload.producerId);
  }

  @SubscribeMessage('sfu:kick-peer')
  async handleKickPeer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SfuKickPeerPayload,
  ): Promise<void> {
    this.logger.log(`Kick peer ${payload.userId} requested by ${client.id}`);
    await this.sfuService.kickPeer(client, payload.userId);
  }
}
