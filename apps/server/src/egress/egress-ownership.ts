import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from 'src/prisma/prisma.service';
import type { Egress } from 'src/generated/prisma/client';

/**
 * Load one egress row scoped to the key's project; missing or foreign rows
 * are indistinguishable 404s.
 */
export function findOwnedEgressRow(
  prisma: PrismaService,
  projectId: string,
  egressId: string,
): Promise<Egress> {
  return prisma.egress.findUnique({ where: { id: egressId } }).then((row) => {
    if (!row || row.projectId !== projectId) {
      throw new NotFoundException('Egress session not found');
    }
    return row;
  });
}
