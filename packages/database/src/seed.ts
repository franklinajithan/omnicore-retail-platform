import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * Idempotent development seed script.
 * 
 * This creates a test tenant, store, and user for development/testing.
 * Running multiple times is safe - it will not create duplicates.
 * 
 * DO NOT use this for production bootstrapping.
 * Production tenants must be created through proper admin procedures.
 */
async function seed() {
  console.log('🌱 Seeding development database...');

  // Create or find test tenant
  const tenant = await db.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Retail Co',
    },
  });
  console.log(`✓ Tenant: ${tenant.name} (${tenant.id})`);

  // Create or find test store
  const store = await db.store.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'TEST01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'TEST01',
      name: 'Test Store',
    },
  });
  console.log(`✓ Store: ${store.name} (${store.code})`);

  // Create or find test user
  // NOTE: userId comes from Supabase Auth - this must match a real auth user
  // For development, create a user in Supabase first, then use their ID here
  const testUserId = process.env.TEST_USER_ID || 'test-user-placeholder';
  
  const tenantUser = await db.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: testUserId,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: testUserId,
      role: 'ADMIN',
    },
  });
  console.log(`✓ TenantUser: ${tenantUser.userId} (${tenantUser.role})`);

  console.log('');
  console.log('✅ Seed complete');
  console.log('');
  console.log('Test credentials:');
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log(`  Store ID: ${store.id}`);
  console.log(`  User ID: ${testUserId}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Create a user in Supabase Auth');
  console.log('  2. Set TEST_USER_ID environment variable to that user\'s ID');
  console.log('  3. Run this seed script again to link the user to the tenant');
  console.log('  4. Use that user\'s JWT to authenticate API requests');
}

seed()
  .catch((error) => {
    console.error('❌ Seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
