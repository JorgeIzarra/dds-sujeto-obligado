// SPEC-SEC-05 / SPEC-SEC-06: JWT service using native crypto
import { createHmac } from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_placeholder_for_development_only';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'test_jwt_secret_key_placeholder_for_development_only')
) {
  throw new Error('JWT_SECRET debe estar configurado en producción (SPEC-SEC-06)');
}

function base64url(str: string | Buffer): string {
  const base64 = typeof str === 'string' ? Buffer.from(str).toString('base64') : str.toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

export interface JWTPayload {
  id: string;
  email: string;
  rol: 'OFICIAL' | 'SUPERVISOR';
}

export function signToken(payload: JWTPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerStr = base64url(JSON.stringify(header));
  const payloadStr = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${headerStr}.${payloadStr}`)
    .digest();
  return `${headerStr}.${payloadStr}.${base64url(signature)}`;
}

export function verifyToken(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerStr, payloadStr, signatureStr] = parts;
  const expectedSignature = createHmac('sha256', JWT_SECRET)
    .update(`${headerStr}.${payloadStr}`)
    .digest();
  if (base64url(expectedSignature) !== signatureStr) {
    return null;
  }
  try {
    return JSON.parse(base64urlDecode(payloadStr)) as JWTPayload;
  } catch {
    return null;
  }
}
