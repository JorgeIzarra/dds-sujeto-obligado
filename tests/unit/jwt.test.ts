import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, JWTPayload } from '../../src/security/jwt.service';

describe('jwt.service', () => {
  it('puede firmar y verificar un token válido', () => {
    const payload: JWTPayload = {
      id: 'some-uuid',
      email: 'test@example.com',
      rol: 'OFICIAL',
    };
    const token = signToken(payload);
    expect(token).toBeTypeOf('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(payload.id);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.rol).toBe(payload.rol);
  });

  it('retorna null para un token inválido o alterado', () => {
    const payload: JWTPayload = {
      id: 'some-uuid',
      email: 'test@example.com',
      rol: 'OFICIAL',
    };
    const token = signToken(payload);
    const parts = token.split('.');
    
    // Alter payload
    const badToken = `${parts[0]}.badpayload.${parts[2]}`;
    expect(verifyToken(badToken)).toBeNull();

    // Alter signature
    const badSigToken = `${parts[0]}.${parts[1]}.badsig`;
    expect(verifyToken(badSigToken)).toBeNull();

    // Invalid format
    expect(verifyToken('invalidtoken')).toBeNull();
  });

  it('lanza error en producción si el secreto es placeholder (SPEC-SEC-06)', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test_jwt_secret_key_placeholder_for_development_only';

    const payload: JWTPayload = { id: 'uuid', email: 'test@example.com', rol: 'OFICIAL' };

    expect(() => signToken(payload)).toThrowError(/JWT_SECRET debe estar configurado en producción/);
    expect(() => verifyToken('some.token.here')).toThrowError(/JWT_SECRET debe estar configurado en producción/);

    // Restaurar entorno
    process.env.NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;
  });
});
