import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(private prisma: PrismaService) {}

  async createRoom(ownerId: string, dto: CreateRoomDto) {
    const slug = await this.generateUniqueSlug();
    return this.prisma.room.create({
      data: {
        name: dto.name,
        slug,
        ownerId,
        maxParticipants: dto.maxParticipants ?? 10,
      },
    });
  }

  async findMany(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;
    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where: { isPublic: true, status: 'active' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.room.count({ where: { isPublic: true, status: 'active' } }),
    ]);
    return { data, total };
  }

  async findBySlug(slug: string) {
    const room = await this.prisma.room.findUnique({ where: { slug } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async findById(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  async softDeleteRoom(id: string) {
    return this.prisma.room.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });
  }

  private generateSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  }

  private async generateUniqueSlug(): Promise<string> {
    let slug = this.generateSlug();
    let attempts = 0;
    while (await this.prisma.room.findUnique({ where: { slug } })) {
      if (attempts++ >= 10) {
        slug = this.generateSlug() + Date.now().toString(36);
        break;
      }
      slug = this.generateSlug();
    }
    return slug;
  }
}
