import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class HybridModeGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.OMNICORE_HYBRID_TENANCY === 'enabled') {
      throw new ServiceUnavailableException('Hybrid mode requires tenant-aware endpoints');
    }
    return true;
  }
}
