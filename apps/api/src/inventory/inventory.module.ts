import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from './inventory.service';

@Module({
  providers: [PrismaService, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
