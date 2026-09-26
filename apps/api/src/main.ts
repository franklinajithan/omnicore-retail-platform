import 'reflect-metadata';
import { CatalogueController } from './catalogue';
import { SuppliersController } from './suppliers';
import { TenantIdentity } from './identity';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
@Controller('health') class HealthController { @Get() health() { return { status: 'ok' }; } }
@Module({ controllers: [HealthController, CatalogueController, SuppliersController], providers: [TenantIdentity] }) class AppModule {}
async function bootstrap() { const app = await NestFactory.create(AppModule); await app.listen(process.env.PORT ?? 3001); }
void bootstrap();
