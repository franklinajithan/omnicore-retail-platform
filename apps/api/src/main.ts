import 'reflect-metadata';
import { CatalogueController } from './catalogue';
import { SuppliersController } from './suppliers';
import { ProductPricesController } from './product-prices';
import { OperationsController } from './operations';
import { TenantIdentity } from './identity';
import { HealthController } from './health';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';

@Module({ controllers: [HealthController, CatalogueController, SuppliersController, ProductPricesController, OperationsController], providers: [TenantIdentity] }) 
class AppModule {}

/**
 * Validate required environment variables before starting the application.
 * Fails fast with clear error messages if configuration is missing.
 */
function validateEnvironment(): void {
  const required = [
    'AUTH_JWT_ISSUER',
    'AUTH_JWT_AUDIENCE',
    'AUTH_JWKS_URL',
    'DATABASE_URL'
  ];

  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // WEB_ALLOWED_ORIGINS is required but can be empty string (handled differently)
  if (process.env.WEB_ALLOWED_ORIGINS === undefined) {
    missing.push('WEB_ALLOWED_ORIGINS');
  }

  if (missing.length > 0) {
    console.error('❌ Configuration Error: Missing required environment variables');
    console.error('');
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    console.error('');
    console.error('Please configure these variables before starting the API.');
    console.error('See docs/api-authentication.md for details.');
    process.exit(1);
  }

  // Validate URL formats without logging actual values
  try {
    new URL(process.env.AUTH_JWT_ISSUER!);
    new URL(process.env.AUTH_JWKS_URL!);
  } catch {
    console.error('❌ Configuration Error: AUTH_JWT_ISSUER and AUTH_JWKS_URL must be valid HTTPS URLs');
    process.exit(1);
  }

  // Validate DATABASE_URL starts with postgresql://
  if (!process.env.DATABASE_URL!.startsWith('postgresql://') && 
      !process.env.DATABASE_URL!.startsWith('postgres://')) {
    console.error('❌ Configuration Error: DATABASE_URL must be a PostgreSQL connection string');
    console.error('Expected format: postgresql://user:pass@host:port/database');
    process.exit(1);
  }

  console.log('✓ Environment configuration validated');
}

export async function createApp() {
  // Validate environment before creating app
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
  
  // Explicitly allow only configured web origins; never reflect arbitrary origins with bearer credentials.
  const origins = (process.env.WEB_ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean);
  if (origins.length) {
    console.log(`✓ CORS enabled for ${origins.length} origin(s)`);
    app.enableCors({ 
      origin: origins, 
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
      allowedHeaders: ['Authorization', 'Content-Type', 'x-tenant-id', 'If-Match'] 
    });
  } else {
    console.warn('⚠ Warning: WEB_ALLOWED_ORIGINS is empty - CORS is disabled');
  }
  
  await app.init();
  return app;
}

// Local development entrypoint. Serverless deployment imports createApp instead.
if (require.main === module) {
  void createApp().then(app => {
    const port = process.env.PORT ?? 3001;
    console.log(`✓ OmniCore API listening on port ${port}`);
    return app.listen(port);
  });
}
