import { ForbiddenException } from '@nestjs/common';
import { StoreAccessController } from './store-access.controller';

describe('StoreAccessController', () => {
  const identity = {
    tenantId: '123e4567-e89b-42d3-a456-426614174000',
    subject: 'employee-1', role: 'STAFF', expiresAt: 2000000000,
  };

  it('checks membership before store authorization', async () => {
    const membership = { authenticate: jest.fn().mockResolvedValue(identity) };
    const stores = { requireStore: jest.fn().mockResolvedValue(undefined) };
    const controller = new StoreAccessController(membership as never, stores as never);
    await expect(controller.check('Bearer signed', 'store-a')).resolves.toEqual({
      authorized: true, tenantId: identity.tenantId, storeId: 'store-a',
    });
    expect(membership.authenticate).toHaveBeenCalledWith('Bearer signed');
    expect(stores.requireStore).toHaveBeenCalledWith(identity, 'store-a');
  });

  it('does not grant access if store authorization fails', async () => {
    const membership = { authenticate: jest.fn().mockResolvedValue(identity) };
    const stores = { requireStore: jest.fn().mockRejectedValue(new ForbiddenException()) };
    const controller = new StoreAccessController(membership as never, stores as never);
    await expect(controller.check('Bearer signed', 'store-b')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
