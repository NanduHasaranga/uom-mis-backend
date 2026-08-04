import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationLogService } from './notification-log.service';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  providers: [NotificationLogService],
  exports: [NotificationLogService],
})
export class NotificationLogModule {}
