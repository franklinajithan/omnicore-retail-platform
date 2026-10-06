import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  async getNextNumber(
    tenantId: string,
    prefix: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    
    const sequence = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.sequence.findUnique({
        where: {
          tenantId_prefix_year: {
            tenantId,
            prefix,
            year,
          },
        },
      });

      if (existing) {
        const updated = await tx.sequence.update({
          where: {
            tenantId_prefix_year: {
              tenantId,
              prefix,
              year,
            },
          },
          data: {
            lastNumber: {
              increment: 1,
            },
          },
        });
        return updated;
      } else {
        return await tx.sequence.create({
          data: {
            tenantId,
            prefix,
            year,
            lastNumber: 1,
          },
        });
      }
    });

    const paddedNumber = sequence.lastNumber.toString().padStart(6, '0');
    return `${prefix}-${year}-${paddedNumber}`;
  }
}
