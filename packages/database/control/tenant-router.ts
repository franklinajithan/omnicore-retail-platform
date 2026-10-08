import { PrismaClient as ControlClient } from './generated/control-client';
import { Prisma, PrismaClient as RetailClient } from '@prisma/client';

export type TenantRoute = {
  tenantId: string;
  databaseKey: string;
  mode: 'SHARED' | 'DEDICATED';
  region: string;
};

/** Resolves routing metadata only. Never accept a database URL from a request. */
export class TenantRouter {
  constructor(private readonly control: ControlClient) {}

  async resolve(tenantId: string): Promise<TenantRoute> {
    const tenant = await this.control.tenantRegistry.findUnique({
      where: { id: tenantId },
      include: { database: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE' || tenant.database.status !== 'ACTIVE') {
      throw new Error('Tenant unavailable');
    }
    return {
      tenantId: tenant.id,
      databaseKey: tenant.database.databaseKey,
      mode: tenant.database.mode,
      region: tenant.database.region,
    };
  }
}

/** Credentials are supplied by server-side secret resolution, never client input. */
export type SecretResolver = (secretReference: string) => Promise<string>;

export class RetailConnectionManager {
  private readonly clients = new Map<string, RetailClient>();
  constructor(
    private readonly control: ControlClient,
    private readonly resolveSecret: SecretResolver,
    private readonly maxPools = 20,
  ) {}

  async forDatabase(databaseKey: string): Promise<RetailClient> {
    const existing = this.clients.get(databaseKey);
    if (existing) return existing;
    if (this.clients.size >= this.maxPools) {
      throw new Error('Database pool capacity reached');
    }
    const record = await this.control.databaseRegistry.findUnique({
      where: { databaseKey },
    });
    if (!record || record.status !== 'ACTIVE') throw new Error('Database unavailable');
    const url = await this.resolveSecret(record.secretReference);
    const client = new RetailClient({ datasources: { db: { url } } });
    await client.$connect();
    this.clients.set(databaseKey, client);
    return client;
  }

  async close(): Promise<void> {
    await Promise.all([...this.clients.values()].map(client => client.$disconnect()));
    this.clients.clear();
  }
}

/**
 * Shared database calls MUST use a restricted DB role and transaction-scoped
 * tenant context with FORCE RLS on tenant-owned tables.
 */
export async function withTenantTransaction<T>(
  client: RetailClient,
  tenantId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return operation(tx);
  });
}
