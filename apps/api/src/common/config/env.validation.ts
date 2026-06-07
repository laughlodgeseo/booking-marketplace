const PLACEHOLDER_VALUES = new Set([
  'change_me',
  'change_me_too',
  'dev_access_secret',
  'dev_refresh_secret',
  'secret',
  'password',
  'replace_with_at_least_32_random_characters',
  'replace_with_at_least_32_random_characters_too',
]);

function normalizedEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function requiredEnv(name: string): string {
  const value = normalizedEnv(name);
  if (!value) throw new Error(`${name} is required.`);

  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) {
    throw new Error(`${name} must not use a placeholder value.`);
  }

  return value;
}

export function requiredJwtSecret(
  name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const value = requiredEnv(name);
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long.`);
  }
  return value;
}

export function validateCriticalEnvironment(): void {
  requiredJwtSecret('JWT_ACCESS_SECRET');
  requiredJwtSecret('JWT_REFRESH_SECRET');
  validateAppOriginInProduction();
  validateCloudinaryInProduction();
  validateStripeKeysInProduction();
}

export function validateAppOriginInProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const origin = (process.env.APP_ORIGIN ?? '').trim();

  if (!origin) {
    throw new Error(
      'APP_ORIGIN is required in production. ' +
        'Set it to the canonical frontend URL, e.g. https://www.rentpropertyuae.com',
    );
  }

  const localhostPatterns = [
    /^https?:\/\/localhost/i,
    /^https?:\/\/127\./,
    /^https?:\/\/0\.0\.0\.0/,
  ];

  for (const pattern of localhostPatterns) {
    if (pattern.test(origin)) {
      throw new Error(
        `APP_ORIGIN must not be a localhost address in production. Got: ${origin}`,
      );
    }
  }

  if (!origin.startsWith('https://')) {
    throw new Error(
      `APP_ORIGIN must use https:// in production. Got: ${origin}. ` +
        'HTTP origins are not permitted in production.',
    );
  }
}

function validateCloudinaryInProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim();
  if (!cloudName) return; // Cloudinary not configured — disk storage fallback is OK

  const apiKey = (process.env.CLOUDINARY_API_KEY ?? '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? '').trim();

  if (!apiKey || !apiSecret) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME is set but CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET ' +
        'are missing. Production uploads require signed credentials — set both or remove CLOUDINARY_CLOUD_NAME.',
    );
  }
}

function validateStripeKeysInProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const secretKey = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (secretKey && !secretKey.startsWith('sk_live_')) {
    console.warn(
      '[ENV] WARNING: STRIPE_SECRET_KEY in production is a test key (sk_test_). ' +
        'Replace with your live key (sk_live_) before accepting real payments.',
    );
  }

  const publishableKey = (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
  ).trim();
  if (publishableKey && !publishableKey.startsWith('pk_live_')) {
    // Warning only — publishable key may be managed on the frontend
    console.warn(
      '[ENV] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in production should start with pk_live_.',
    );
  }

  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET must start with whsec_. ' +
        'Use the webhook endpoint secret from the Stripe dashboard, not the Stripe CLI secret.',
    );
  }
}
