import {ForbiddenException,Injectable,UnauthorizedException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {PrismaService} from './prisma.service';

/** Catalogue permissions are derived from an unexpired server-issued session, not request claims. */
@Injectable()
export class CatalogAccessService {
 constructor(private readonly db:PrismaService){}
 async requireEditor(tenantId:string,token?:string) {
  if(!token||!/^Bearer [A-Za-z0-9_-]{32,256}$/.test(token))throw new UnauthorizedException('Employee session required');
  const hash=createHash('sha256').update(token.slice(7)).digest('hex');
  const session=await this.db.catalogEmployeeSession.findUnique({where:{tokenHash:hash},include:{employee:{select:{id:true,tenantId:true,role:true,status:true}}}});
  if(!session||session.revokedAt||session.expiresAt<=new Date()||session.employee.tenantId!==tenantId||session.employee.status!=='ACTIVE')throw new UnauthorizedException('Invalid or expired employee session');
  if(!['SUPER_ADMIN','HEAD_OFFICE_MANAGER','CATALOG_MANAGER'].includes(session.employee.role))throw new ForbiddenException('Catalogue editor role required');
  return session.employee.id;
 }
}
