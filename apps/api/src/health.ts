import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
  private db = new PrismaClient();

  @Get()
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  async ready() {
    const timestamp = new Date().toISOString();
    
    try {
      // Test database connectivity with a simple query
      await this.db.$queryRaw`SELECT 1 as health`;
      
      return {
        status: 'ready',
        database: 'connected',
        timestamp
      };
    } catch (error) {
      // Don't expose internal error details to clients
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database health check failed:', message);
      
      return {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp
      };
    }
  }
}
