import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchasingController } from './purchasing.controller';
import { PurchasingReceivingController } from './receiving.controller';
import { PurchasingReceivingService } from './receiving.service';
import { PurchasingReviewController } from './review.controller';

/** Register PurchasingModule in the API composition root after integration review. */
@Module({
  controllers: [PurchasingController, PurchasingReceivingController, PurchasingReviewController],
  providers: [PrismaService, PurchasingReceivingService],
})
export class PurchasingModule {}
