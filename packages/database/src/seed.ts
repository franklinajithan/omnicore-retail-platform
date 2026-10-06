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
    // Organisation
    { code: 'tenant.read', name: 'View Organisation', module: 'organisation' },
    { code: 'tenant.update', name: 'Update Organisation', module: 'organisation' },
    
    // Stores
    { code: 'store.read', name: 'View Stores', module: 'stores' },
    { code: 'store.create', name: 'Create Stores', module: 'stores' },
    { code: 'store.update', name: 'Update Stores', module: 'stores' },
    { code: 'store.archive', name: 'Archive Stores', module: 'stores' },
    
    // Users
    { code: 'user.read', name: 'View Users', module: 'users' },
    { code: 'user.create', name: 'Create Users', module: 'users' },
    { code: 'user.update', name: 'Update Users', module: 'users' },
    { code: 'user.assign_store', name: 'Assign Users to Stores', module: 'users' },
    { code: 'user.assign_role', name: 'Assign Roles to Users', module: 'users' },
    
    // Roles
    { code: 'role.read', name: 'View Roles', module: 'roles' },
    
    // Audit
    { code: 'audit.read', name: 'View Audit Log', module: 'audit' },
    
    // Products - Day 2
    { code: 'product.read', name: 'View Products', module: 'products' },
    { code: 'product.create', name: 'Create Products', module: 'products' },
    { code: 'product.update', name: 'Update Products', module: 'products' },
    { code: 'product.archive', name: 'Archive Products', module: 'products' },
    { code: 'product.merge', name: 'Merge Products', module: 'products' },
    { code: 'product.import', name: 'Import Products', module: 'products' },
    { code: 'product.export', name: 'Export Products', module: 'products' },
    
    // Manufacturers - Day 2
    { code: 'manufacturer.read', name: 'View Manufacturers', module: 'manufacturers' },
    { code: 'manufacturer.create', name: 'Create Manufacturers', module: 'manufacturers' },
    { code: 'manufacturer.update', name: 'Update Manufacturers', module: 'manufacturers' },
    
    // Brands - Day 2
    { code: 'brand.read', name: 'View Brands', module: 'brands' },
    { code: 'brand.create', name: 'Create Brands', module: 'brands' },
    { code: 'brand.update', name: 'Update Brands', module: 'brands' },
    
    // Categories - Day 2
    { code: 'category.read', name: 'View Categories', module: 'categories' },
    { code: 'category.create', name: 'Create Categories', module: 'categories' },
    { code: 'category.update', name: 'Update Categories', module: 'categories' },
    
    // Suppliers - Day 2 (extended)
    { code: 'supplier.read', name: 'View Suppliers', module: 'suppliers' },
    { code: 'supplier.create', name: 'Create Suppliers', module: 'suppliers' },
    { code: 'supplier.update', name: 'Update Suppliers', module: 'suppliers' },
    { code: 'supplier.archive', name: 'Archive Suppliers', module: 'suppliers' },
    
    // Supplier Products - Day 2
    { code: 'supplier_product.read', name: 'View Supplier Products', module: 'suppliers' },
    { code: 'supplier_product.create', name: 'Create Supplier Products', module: 'suppliers' },
    { code: 'supplier_product.update', name: 'Update Supplier Products', module: 'suppliers' },
    
    // Pricing - Day 2
    { code: 'pricing.read', name: 'View Retail Prices', module: 'pricing' },
    { code: 'pricing.update', name: 'Update Retail Prices', module: 'pricing' },
    
    // Costs - Day 2 (sensitive)
    { code: 'cost.read', name: 'View Supplier Costs', module: 'costs' },
    { code: 'cost.update', name: 'Update Supplier Costs', module: 'costs' },
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
