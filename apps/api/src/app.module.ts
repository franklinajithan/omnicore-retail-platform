import { RetailController } from './retail.controller';
import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PrismaService } from './prisma.service';
import { CoreAccessService } from './core-access';
@Module({controllers:[PosController,RetailController],providers:[PosService,PrismaService,CoreAccessService]})
export class AppModule {}
