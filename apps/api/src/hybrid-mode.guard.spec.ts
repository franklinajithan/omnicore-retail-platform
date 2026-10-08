import { HybridModeGuard } from './hybrid-mode.guard';

describe('HybridModeGuard', () => {
  const previous = process.env.OMNICORE_HYBRID_TENANCY;
  afterEach(() => {
    if (previous === undefined) delete process.env.OMNICORE_HYBRID_TENANCY;
    else process.env.OMNICORE_HYBRID_TENANCY = previous;
  });

  it('allows legacy mode by default', () => {
    delete process.env.OMNICORE_HYBRID_TENANCY;
    expect(new HybridModeGuard().canActivate({} as never)).toBe(true);
  });

  it('blocks legacy endpoints in hybrid mode', () => {
    process.env.OMNICORE_HYBRID_TENANCY = 'enabled';
    expect(() => new HybridModeGuard().canActivate({} as never)).toThrow();
  });
});
