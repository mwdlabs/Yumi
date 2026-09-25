import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA256 en hexadécimal. Sert à stocker les codes courts sans les garder en clair. */
export function hmacSha256(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** SHA-256 en hexadécimal. Suffisant pour des jetons aléatoires à haute entropie. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Code numérique aléatoire (cryptographiquement sûr), complété de zéros à gauche. */
export function randomDigits(length: number): string {
  return Array.from({ length }, () => randomInt(0, 10)).join('');
}

/** Jeton opaque aléatoire de 256 bits, encodé en base64url. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Comparaison de deux chaînes en temps constant. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
