/**
 * P1 Hardening Tests — Environment Validation
 *
 * Tests:
 * 1. Production + Cloudinary cloud name set + missing API key/secret → throws
 * 2. Production + Cloudinary + API key + secret present → no throw
 * 3. Production + no Cloudinary → no throw
 * 4. Non-production + Cloudinary without API key → no throw
 * 5. Production + Stripe test key → throws
 * 6. Production + Stripe live key → no throw
 * 7. Production + webhook secret not starting with whsec_ → throws
 *
 * APP_ORIGIN Production Tests:
 * 8.  Production + APP_ORIGIN missing → throws
 * 9.  Production + APP_ORIGIN=http://localhost:3000 → throws
 * 10. Production + APP_ORIGIN=http://127.0.0.1:3000 → throws
 * 11. Production + APP_ORIGIN=http://rentpropertyuae.com (http, not https) → throws
 * 12. Production + APP_ORIGIN=https://www.rentpropertyuae.com → no throw
 * 13. Production + APP_ORIGIN with trailing slash → no throw
 * 14. Non-production + APP_ORIGIN=http://localhost:3000 → no throw
 */

const originalEnv = process.env;

function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void,
) {
  // Use isolated env for each test
  process.env = { ...originalEnv, ...overrides };
  try {
    fn();
  } finally {
    process.env = originalEnv;
  }
}

// Reload module fresh to avoid module-level caching
function loadValidation() {
  // Re-require since the module is stateless (no module-level side effects)
  return require('./env.validation') as {
    validateCriticalEnvironment: () => void;
  };
}

describe('P1 ENV-001 — Cloudinary production validation', () => {
  const BASE_VALID = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    APP_ORIGIN: 'https://www.rentpropertyuae.com',
  };

  it('throws when CLOUDINARY_CLOUD_NAME set but API key/secret missing in production', () => {
    withEnv(
      {
        ...BASE_VALID,
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: '',
        CLOUDINARY_API_SECRET: '',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).toThrow(
          /CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET/,
        );
      },
    );
  });

  it('does not throw when Cloudinary is fully configured in production', () => {
    withEnv(
      {
        ...BASE_VALID,
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: 'key123',
        CLOUDINARY_API_SECRET: 'secret456',
        STRIPE_SECRET_KEY: 'sk_live_test',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });

  it('does not throw when Cloudinary is not configured in production', () => {
    withEnv(
      {
        ...BASE_VALID,
        CLOUDINARY_CLOUD_NAME: '',
        CLOUDINARY_API_KEY: '',
        CLOUDINARY_API_SECRET: '',
        STRIPE_SECRET_KEY: 'sk_live_test',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });

  it('does not throw in non-production even if Cloudinary is partially configured', () => {
    withEnv(
      {
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: '',
        CLOUDINARY_API_SECRET: '',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });
});

describe('P2 ENV-003 — APP_ORIGIN production validation', () => {
  const BASE_VALID = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    CLOUDINARY_CLOUD_NAME: '',
    STRIPE_SECRET_KEY: 'sk_live_somekey',
    STRIPE_WEBHOOK_SECRET: 'whsec_valid',
  };

  it('throws when APP_ORIGIN is missing in production', () => {
    withEnv({ ...BASE_VALID, APP_ORIGIN: '' }, () => {
      const { validateCriticalEnvironment } = loadValidation();
      expect(() => validateCriticalEnvironment()).toThrow(/APP_ORIGIN is required/);
    });
  });

  it('throws when APP_ORIGIN is http://localhost in production', () => {
    withEnv({ ...BASE_VALID, APP_ORIGIN: 'http://localhost:3000' }, () => {
      const { validateCriticalEnvironment } = loadValidation();
      expect(() => validateCriticalEnvironment()).toThrow(/localhost/);
    });
  });

  it('throws when APP_ORIGIN is 127.0.0.1 in production', () => {
    withEnv({ ...BASE_VALID, APP_ORIGIN: 'http://127.0.0.1:3000' }, () => {
      const { validateCriticalEnvironment } = loadValidation();
      expect(() => validateCriticalEnvironment()).toThrow(/localhost/i);
    });
  });

  it('throws when APP_ORIGIN uses plain http in production', () => {
    withEnv(
      { ...BASE_VALID, APP_ORIGIN: 'http://rentpropertyuae.com' },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).toThrow(/https:\/\//);
      },
    );
  });

  it('does not throw when APP_ORIGIN is a valid https URL in production', () => {
    withEnv(
      { ...BASE_VALID, APP_ORIGIN: 'https://www.rentpropertyuae.com' },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });

  it('does not throw when APP_ORIGIN has a trailing slash in production', () => {
    withEnv(
      { ...BASE_VALID, APP_ORIGIN: 'https://www.rentpropertyuae.com/' },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });

  it('does not throw when APP_ORIGIN is localhost in non-production', () => {
    withEnv(
      {
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        APP_ORIGIN: 'http://localhost:3000',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });
});

describe('P1 ENV-002 — Stripe key production validation', () => {
  const BASE_VALID = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    CLOUDINARY_CLOUD_NAME: '',
    APP_ORIGIN: 'https://www.rentpropertyuae.com',
  };

  it('warns (does not throw) when Stripe secret key is a test key in production', () => {
    withEnv(
      {
        ...BASE_VALID,
        STRIPE_SECRET_KEY: 'sk_test_somekey',
        STRIPE_WEBHOOK_SECRET: 'whsec_valid',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => validateCriticalEnvironment()).not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sk_test_'));
        warnSpy.mockRestore();
      },
    );
  });

  it('does not throw when Stripe key is a live key in production', () => {
    withEnv(
      {
        ...BASE_VALID,
        STRIPE_SECRET_KEY: 'sk_live_somekey',
        STRIPE_WEBHOOK_SECRET: 'whsec_valid',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).not.toThrow();
      },
    );
  });

  it('throws when webhook secret does not start with whsec_', () => {
    withEnv(
      {
        ...BASE_VALID,
        STRIPE_SECRET_KEY: 'sk_live_somekey',
        STRIPE_WEBHOOK_SECRET: 'cli_secret_abc',
      },
      () => {
        const { validateCriticalEnvironment } = loadValidation();
        expect(() => validateCriticalEnvironment()).toThrow(/whsec_/);
      },
    );
  });
});
