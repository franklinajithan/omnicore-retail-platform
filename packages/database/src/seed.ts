import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { code: 'MIESZKO' },
    update: {},
    create: {
      code: 'MIESZKO',
      name: 'Mieszko Retail Demo',
      legalName: 'Mieszko Retail Operations Ltd',
      tradingName: 'Mieszko Retail',
      status: 'ACTIVE',
      countryCode: 'GB',
      currencyCode: 'GBP',
      timezone: 'Europe/London',
      locale: 'en-GB',
      email: 'info@mieszko-demo.local',
      phone: '+44 20 1234 5678',
      addressLine1: '123 High Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
  });

  console.log(`✓ Created tenant: ${tenant.name}`);

  const stores = [
    { code: 'HOUNSLOW', name: 'Hounslow', city: 'Hounslow', postcode: 'TW3 1ES' },
    { code: 'HAYES', name: 'Hayes', city: 'Hayes', postcode: 'UB3 4DU' },
    { code: 'PERIVALE', name: 'Perivale', city: 'Perivale', postcode: 'UB6 8TW' },
    { code: 'GRAVESEND', name: 'Gravesend', city: 'Gravesend', postcode: 'DA11 0DA' },
    { code: 'WATFORD', name: 'Watford', city: 'Watford', postcode: 'WD17 2DT' },
    { code: 'STREATHAM', name: 'Streatham', city: 'Streatham', postcode: 'SW16 1DP' },
    { code: 'EASTHAM', name: 'Eastham', city: 'Eastham', postcode: 'CH62 0AR' },
  ];

  for (const storeData of stores) {
    const store = await prisma.store.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: storeData.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: storeData.code,
        name: storeData.name,
        status: 'ACTIVE',
        storeType: 'CONVENIENCE',
        city: storeData.city,
        postcode: storeData.postcode,
        country: 'United Kingdom',
        timezone: 'Europe/London',
      },
    });
    console.log(`✓ Created store: ${store.name}`);
  }

  const permissions = [
    { code: 'tenant.read', name: 'View Organisation', module: 'organisation' },
    { code: 'tenant.update', name: 'Update Organisation', module: 'organisation' },
    { code: 'store.read', name: 'View Stores', module: 'stores' },
    { code: 'store.create', name: 'Create Stores', module: 'stores' },
    { code: 'store.update', name: 'Update Stores', module: 'stores' },
    { code: 'store.archive', name: 'Archive Stores', module: 'stores' },
    { code: 'user.read', name: 'View Users', module: 'users' },
    { code: 'user.create', name: 'Create Users', module: 'users' },
    { code: 'user.update', name: 'Update Users', module: 'users' },
    { code: 'user.assign_store', name: 'Assign Users to Stores', module: 'users' },
    { code: 'user.assign_role', name: 'Assign Roles to Users', module: 'users' },
    { code: 'role.read', name: 'View Roles', module: 'roles' },
    { code: 'audit.read', name: 'View Audit Log', module: 'audit' },
  ];

  for (const permData of permissions) {
    await prisma.permission.upsert({
      where: { code: permData.code },
      update: {},
      create: permData,
    });
  }

  console.log(`✓ Created ${permissions.length} permissions`);

  const systemRoles = [
    {
      code: 'PLATFORM_ADMIN',
      name: 'Platform Administrator',
      description: 'Full system access',
      type: 'SYSTEM' as const,
      permissions: permissions.map(p => p.code),
    },
    {
      code: 'TENANT_ADMIN',
      name: 'Organisation Administrator',
      description: 'Full organisation access',
      type: 'SYSTEM' as const,
      permissions: permissions.map(p => p.code),
    },
    {
      code: 'STORE_MANAGER',
      name: 'Store Manager',
      description: 'Manage assigned stores',
      type: 'SYSTEM' as const,
      permissions: ['store.read', 'user.read', 'audit.read'],
    },
  ];

  for (const roleData of systemRoles) {
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: null, code: roleData.code } },
      update: {},
      create: {
        code: roleData.code,
        name: roleData.name,
        description: roleData.description,
        type: roleData.type,
        isActive: true,
      },
    });

    for (const permCode of roleData.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { code: permCode },
      });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log(`✓ Created role: ${role.name}`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
