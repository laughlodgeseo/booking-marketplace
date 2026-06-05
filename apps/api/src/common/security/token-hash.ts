import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const TOKEN_SALT_ROUNDS = 12;

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, TOKEN_SALT_ROUNDS);
}

export async function verifyToken(
  token: string,
  tokenHash: string,
): Promise<boolean> {
  return bcrypt.compare(token, tokenHash);
}

/**
 * Deterministic SHA-256 hex hash for fast single-lookup of reset tokens.
 * Password reset tokens use this alongside the bcrypt hash for O(1) lookup.
 * Safe because the 64-byte random token provides sufficient entropy — the
 * protection comes from the token's randomness, not hash-stretching.
 */
export function hashTokenDeterministic(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
