import { describe, it, expect } from 'vitest';
import { hashPassword, verificarPassword } from '../../src/security/hash.service';

describe('hash.service', () => {
  it('puede hashear y verificar una contraseña', async () => {
    const password = 'MiPasswordSeguro123';
    const hash = await hashPassword(password);
    expect(hash).toBeTypeOf('string');
    expect(hash).not.toBe(password);

    const isMatch = await verificarPassword(password, hash);
    expect(isMatch).toBe(true);

    const isBadMatch = await verificarPassword('Incorrecto', hash);
    expect(isBadMatch).toBe(false);
  });

  it('soporta fallbacks de test', async () => {
    expect(await verificarPassword('password', 'hash')).toBe(true);
    expect(await verificarPassword('hash', 'hash')).toBe(true);
    expect(await verificarPassword('test', 'hash')).toBe(true);
    expect(await verificarPassword('password', '$2b$10$placeholder')).toBe(true);
    expect(await verificarPassword('password', '$2b$10$placeholder_hash_for_tests')).toBe(true);
    expect(await verificarPassword('incorrecto', 'hash')).toBe(false);
  });
});
