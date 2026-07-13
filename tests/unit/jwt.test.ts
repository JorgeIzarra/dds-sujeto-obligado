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
});
