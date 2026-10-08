import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController authorization and validation', () => {
  const original = process.env.OMNICORE_HO_TOKEN;
  const originalPos = process.env.OMNICORE_POS_TOKEN;
  const service = {
    balance: jest.fn(), movements: jest.fn(), post: jest.fn(),
  };
  const controller = new InventoryController(service as unknown as InventoryService);

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.OMNICORE_HO_TOKEN = 'test-head-office-token';
    process.env.OMNICORE_POS_TOKEN = 'test-pos-token';
  });
  afterAll(() => {
    if (original === undefined) delete process.env.OMNICORE_HO_TOKEN;
    else process.env.OMNICORE_HO_TOKEN = original;
    if (originalPos === undefined) delete process.env.OMNICORE_POS_TOKEN;
    else process.env.OMNICORE_POS_TOKEN = originalPos;
  });

  it('rejects missing authorization', () => {
    expect(() => controller.balance(undefined, 'tenant', 'store', 'product')).toThrow(UnauthorizedException);
  });

  it('rejects empty tenant IDs', () => {
    expect(() => controller.balance('Bearer test-head-office-token', '', 'store', 'product')).toThrow(BadRequestException);
  });

  it('allows POS token to read movements', () => {
    controller.movements('Bearer test-pos-token', 'tenant', 'store', 'product');
    expect(service.movements).toHaveBeenCalledWith('tenant', 'store', 'product');
  });

  it('does not allow POS token to post inventory', () => {
    expect(() => controller.post('Bearer test-pos-token', {} as never)).toThrow(UnauthorizedException);
  });

  it('rejects negative override even with head-office token', () => {
    expect(() => controller.post('Bearer test-head-office-token', { type: 'ADJUSTMENT', allowNegative: true } as never)).toThrow(BadRequestException);
  });

  it('rejects unsupported movement types', () => {
    expect(() => controller.post('Bearer test-head-office-token', { type: 'UNKNOWN' } as never)).toThrow(BadRequestException);
  });

  it('forces safe stock policy on posted movement', () => {
    const input = { tenantId: 'tenant', storeId: 'store', productId: 'product', type: 'RECEIPT',
      quantityDelta: '1', referenceType: 'TEST', referenceId: 'test', idempotencyKey: 'key' } as const;
    controller.post('Bearer test-head-office-token', input);
    expect(service.post).toHaveBeenCalledWith({ ...input, allowNegative: false });
  });
});
