// SPEC-SEC-01 — Cifrado en reposo AES-256-GCM
// Tests unitarios del crypto.service ANTES de implementar el repositorio.
// Criterio de cumplimiento: un SELECT directo a la BD no devuelve el dato en claro
// (cubierto aquí a nivel de función; verificado en tests/integration/cifrado.test.ts contra la BD).
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/security/crypto.service';

describe('SPEC-SEC-01 — encrypt / decrypt (AES-256-GCM)', () => {
  it('encrypt devuelve una cadena base64 distinta del plaintext', () => {
    const plaintext = 'Juan Pérez';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(Buffer.from(ciphertext, 'base64').length).toBeGreaterThan(0);
  });

  it('decrypt(encrypt(x)) === x (ida y vuelta)', () => {
    const valores = ['Ana López', '8-123-45678', 'Panamá', ''];
    for (const v of valores) {
      expect(decrypt(encrypt(v))).toBe(v);
    }
  });

  it('dos llamadas a encrypt producen ciphertexts distintos (IV aleatorio)', () => {
    const plaintext = 'mismo texto';
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it('falla con tag adulterado (integridad GCM)', () => {
    const ciphertext = encrypt('dato sensible');
    const buf = Buffer.from(ciphertext, 'base64');
    buf[15] ^= 0xff; // corromper el authTag
    expect(() => decrypt(buf.toString('base64'))).toThrow();
  });

  it('lanza error si ENCRYPTION_KEY no está configurada', () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY no configurada');
    process.env.ENCRYPTION_KEY = original;
  });

  it('lanza error si ENCRYPTION_KEY decodifica a longitud distinta de 32 bytes (línea 16)', () => {
    const original = process.env.ENCRYPTION_KEY;
    // 16 bytes en base64 = clave AES-128, no AES-256
    process.env.ENCRYPTION_KEY = Buffer.alloc(16).toString('base64');
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY debe decodificar exactamente 32 bytes');
    process.env.ENCRYPTION_KEY = original;
  });
});
