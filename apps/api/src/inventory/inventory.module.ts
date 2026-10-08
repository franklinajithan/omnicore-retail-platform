import { ReceiptDiscrepancyController } from './receipt-discrepancy.controller';
import { ReceiptDiscrepancyService } from './receipt-discrepancy.service';
import { StockValuationController } from './stock-valuation.controller';
import { StockValuationService } from './stock-valuation.service';
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
  controllers: [ReceiptDiscrepancyController, InventoryController, StockTransferController, GoodsReceivingController, StockAdjustmentController, StockValuationController],
  providers: [ReceiptDiscrepancyService, InventoryService, StockTransferService, GoodsReceivingService, StockAdjustmentService, StockValuationService, PrismaService],
  exports: [ReceiptDiscrepancyService, InventoryService, StockTransferService, GoodsReceivingService, StockAdjustmentService, StockValuationService],
})
export class InventoryModule {}
