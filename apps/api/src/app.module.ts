import { RetailController } from './retail.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PrismaService } from './prisma.service';
import { HybridModeGuard } from './hybrid-mode.guard';

@Module({
  controllers: [PosController, RetailController],
  providers: [
    PosService,
    PrismaService,
    { provide: APP_GUARD, useClass: HybridModeGuard },
  ],
})
export class AppModule {}
