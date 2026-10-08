import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockTransferController } from './stock-transfer.controller';
import { StockTransferService } from './stock-transfer.service';
import { GoodsReceivingController } from './goods-receiving.controller';
import { GoodsReceivingService } from './goods-receiving.service';

@Module({
  controllers: [InventoryController, StockTransferController, GoodsReceivingController],
  providers: [InventoryService, StockTransferService, GoodsReceivingService, PrismaService],
  exports: [InventoryService, StockTransferService, GoodsReceivingService],
})
export class InventoryModule {}
