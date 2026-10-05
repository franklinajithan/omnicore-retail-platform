import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';
import { TenantContext } from './types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const tenant = await this.extractTenantContext(authHeader, request);
    request.tenant = tenant;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every((permission) =>
        tenant.permissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }

  private async extractTenantContext(
    authHeader: string,
    request: any,
  ): Promise<TenantContext> {
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return this.decodeTenantContext(token);
    }

    throw new UnauthorizedException('Invalid authorization header format');
  }

  private async decodeTenantContext(token: string): Promise<TenantContext> {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return {
        tenantId: decoded.tenantId,
        userId: decoded.userId,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
