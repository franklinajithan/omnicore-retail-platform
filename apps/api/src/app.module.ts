import { Module } from '@nestjs/common';
import { RetailController } from './retail.controller';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PrismaService } from './prisma.service';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [PosController, RetailController],
  providers: [PosService, PrismaService],
})
export class AppModule {}
