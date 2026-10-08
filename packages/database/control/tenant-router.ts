import { PrismaClient as ControlClient } from '../generated/control-client';
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
    if (tenant.database.mode === 'DEDICATED') {
      const count = await this.control.tenantRegistry.count({ where: { databaseId: tenant.databaseId } });
      if (count !== 1) throw new Error('Dedicated database must belong to exactly one tenant');
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
  private readonly pending = new Map<string, Promise<RetailClient>>();
  constructor(
    private readonly control: ControlClient,
    private readonly resolveSecret: SecretResolver,
    private readonly maxPools = 20,
  ) {}

  async forDatabase(databaseKey: string): Promise<RetailClient> {
    const existing = this.clients.get(databaseKey);
    if (existing) return existing;
    const inflight = this.pending.get(databaseKey);
    if (inflight) return inflight;
    if (this.clients.size + this.pending.size >= this.maxPools) {
      throw new Error('Database pool capacity reached');
    }
    const opening = this.openDatabase(databaseKey);
    this.pending.set(databaseKey, opening);
    try {
      return await opening;
    } finally {
      this.pending.delete(databaseKey);
    }
  }

  private async openDatabase(databaseKey: string): Promise<RetailClient> {
    const record = await this.control.databaseRegistry.findUnique({
      where: { databaseKey },
    });
    if (!record || record.status !== 'ACTIVE') throw new Error('Database unavailable');
    const url = await this.resolveSecret(record.secretReference);
    const client = new RetailClient({ datasources: { db: { url } } });
    try {
      await client.$connect();
    } catch (error) {
      await client.$disconnect().catch(() => undefined);
      throw error;
    }
    this.clients.set(databaseKey, client);
    return client;
  }

  async close(): Promise<void> {
    await Promise.allSettled([...this.pending.values()]);
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
