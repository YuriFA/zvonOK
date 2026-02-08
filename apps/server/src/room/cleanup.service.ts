import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ROOM_TTL_HOURS = 1;

@Injectable()
export class RoomCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(RoomCleanupService.name);
  private intervalId: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {
    this.startCleanupJob();
  }

  private startCleanupJob() {
    this.intervalId = setInterval(() => {
      this.cleanupOldRooms();
    }, CLEANUP_INTERVAL_MS);
    this.cleanupOldRooms();
  }

  private async cleanupOldRooms() {
    const cutoffDate = new Date(Date.now() - ROOM_TTL_HOURS * 60 * 60 * 1000);
    const result = await this.prisma.room.deleteMany({
      where: {
        status: 'ended',
        endedAt: { lt: cutoffDate },
      },
    });
    this.logger.log(`Cleaned up ${result.count} old rooms`);
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
