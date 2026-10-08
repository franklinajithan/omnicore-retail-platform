import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockTransferController } from './stock-transfer.controller';
import { StockTransferService } from './stock-transfer.service';

@Module({
  controllers: [InventoryController, StockTransferController],
  providers: [InventoryService, StockTransferService, PrismaService],
  exports: [InventoryService, StockTransferService],
})
export class InventoryModule {}
