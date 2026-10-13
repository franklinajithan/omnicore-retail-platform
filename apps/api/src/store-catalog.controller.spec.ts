import { ForbiddenException } from '@nestjs/common';
import { StoreCatalogController } from './store-catalog.controller';

const identity = {
  tenantId: '123e4567-e89b-42d3-a456-426614174000',
  subject: 'employee-1',
  role: 'STAFF',
  expiresAt: 2000000000,
};

describe('StoreCatalogController', () => {
  it('restricts product query to authenticated tenant', async () => {
    const membership = { authenticate: jest.fn().mockResolvedValue(identity) };
    const access = { requireStore: jest.fn().mockResolvedValue(undefined) };
    const db = { product: { findMany: jest.fn().mockResolvedValue([]) } };
    const controller = new StoreCatalogController(membership as never, access as never, db as never);
    await expect(controller.products('Bearer signed', 'store-a')).resolves.toEqual({
      tenantId: identity.tenantId, storeId: 'store-a', products: [],
    });
    expect(db.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: identity.tenantId, status: 'ACTIVE' },
    }));
    expect(access.requireStore).toHaveBeenCalledWith(identity, 'store-a');
  });

  it('never reads product data after access denial', async () => {
    const membership = { authenticate: jest.fn().mockResolvedValue(identity) };
    const access = { requireStore: jest.fn().mockRejectedValue(new ForbiddenException()) };
    const db = { product: { findMany: jest.fn() } };
    const controller = new StoreCatalogController(membership as never, access as never, db as never);
    await expect(controller.products('Bearer signed', 'store-b')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });
});
