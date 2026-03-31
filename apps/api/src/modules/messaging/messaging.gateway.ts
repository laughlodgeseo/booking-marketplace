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
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { UserRole } from '@prisma/client';

type AuthenticatedSocket = Socket & {
  userId?: string;
  userRole?: UserRole;
};

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwt: JwtService,
    private readonly messaging: MessagingService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      // Track connection
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)!.add(client.id);

      // Join user's personal room for targeted messages
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.connectedUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(
        `Client disconnected: ${client.id} (user: ${client.userId})`,
      );
    }
  }

  @SubscribeMessage('joinThread')
  handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;
    client.join(`thread:${data.threadId}`);
    return { event: 'joinedThread', data: { threadId: data.threadId } };
  }

  @SubscribeMessage('leaveThread')
  handleLeaveThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    client.leave(`thread:${data.threadId}`);
    return { event: 'leftThread', data: { threadId: data.threadId } };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; body: string },
  ) {
    if (!client.userId || !client.userRole) return;

    try {
      const message = await this.messaging.sendMessage(
        data.threadId,
        { userId: client.userId, role: client.userRole },
        data.body,
      );

      // Broadcast to other clients in the thread room (excludes sender)
      client
        .to(`thread:${data.threadId}`)
        .emit('newMessage', message);

      return { event: 'messageSent', data: message };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'error', data: { message: msg } };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;

    // Broadcast typing indicator to other clients in the thread
    client
      .to(`thread:${data.threadId}`)
      .emit('userTyping', {
        threadId: data.threadId,
        userId: client.userId,
      });
  }

  /**
   * Emit a new message event to a specific user (called from service layer).
   */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
