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
}