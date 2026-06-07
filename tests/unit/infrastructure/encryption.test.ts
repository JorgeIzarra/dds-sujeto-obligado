import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from '../../../src/infrastructure/security/EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    service = new EncryptionService();
  });

  it('debe cifrar y descifrar correctamente', () => {
    const plaintext = 'Juan Pérez';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(encrypted).not.toBe(plaintext);
  });

  it('debe generar cifrados diferentes para el mismo texto (IV aleatorio)', () => {
    const plaintext = 'Dato sensible';
    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('debe fallar con clave inválida', () => {
    process.env.ENCRYPTION_KEY = 'invalid';
    expect(() => new EncryptionService()).toThrow();
  });

  it('debe fallar al descifrar con formato inválido', () => {
    expect(() => service.decrypt('invalid')).toThrow(
      'Invalid ciphertext format',
    );
  });

  it('debe fallar al descifrar con clave incorrecta', () => {
    const plaintext = 'Dato sensible';
    const encrypted = service.encrypt(plaintext);

    process.env.ENCRYPTION_KEY =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    const service2 = new EncryptionService();

    expect(() => service2.decrypt(encrypted)).toThrow();
  });

  it('debe manejar strings vacíos', () => {
    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('debe manejar strings largos', () => {
    const plaintext = 'A'.repeat(10000);
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('debe manejar caracteres especiales', () => {
    const plaintext = 'Ñandú! @#$% 123_üñíçödé';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
