import 'reflect-metadata';
import { CatalogueController } from './catalogue';
import { SuppliersController } from './suppliers';
import { ProductPricesController } from './product-prices';
import { OperationsController } from './operations';
import { TenantIdentity } from './identity';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
@Controller('health') class HealthController { @Get() health() { return { status: 'ok' }; } }
@Module({ controllers: [HealthController, CatalogueController, SuppliersController, ProductPricesController, OperationsController], providers: [TenantIdentity] }) class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Explicitly allow only configured web origins; never reflect arbitrary origins with bearer credentials.
  const origins = (process.env.WEB_ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean);
  if (origins.length) app.enableCors({ origin: origins, methods: ['GET', 'POST', 'PUT', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type', 'x-tenant-id', 'If-Match'] });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
