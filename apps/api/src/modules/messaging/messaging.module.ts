import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminMessagesController,
  UserMessagesController,
  VendorMessagesController,
} from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [
    AdminMessagesController,
    VendorMessagesController,
    UserMessagesController,
  ],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
