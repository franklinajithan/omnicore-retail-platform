import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockTransferController } from './stock-transfer.controller';
import { StockTransferService } from './stock-transfer.service';
import { GoodsReceivingController } from './goods-receiving.controller';
import { GoodsReceivingService } from './goods-receiving.service';
import { StockAdjustmentController } from './stock-adjustment.controller';
import { StockAdjustmentService } from './stock-adjustment.service';

@Module({
  controllers: [InventoryController, StockTransferController, GoodsReceivingController, StockAdjustmentController],
  providers: [InventoryService, StockTransferService, GoodsReceivingService, StockAdjustmentService, PrismaService],
  exports: [InventoryService, StockTransferService, GoodsReceivingService, StockAdjustmentService],
})
export class InventoryModule {}
