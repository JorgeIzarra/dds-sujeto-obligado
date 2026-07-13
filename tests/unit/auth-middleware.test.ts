import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize, checkEdicionFormulario } from '../../src/security/auth.middleware';
import { signToken } from '../../src/security/jwt.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('auth.middleware unit tests', () => {
  let oficialId: string;
  let oficialToken: string;

  beforeAll(async () => {
    const oficial = await prisma.oficial.create({
      data: {
        nombre: 'Oficial Middleware Unit',
        cargo: 'OFICIAL',
        email: `oficial-mid-${Date.now()}@test.com`,
        hashPassword: 'hash',
      },
    });
    oficialId = oficial.id;
    oficialToken = signToken({ id: oficialId, email: oficial.email, rol: 'OFICIAL' });
  });

  afterAll(async () => {
    await prisma.formularioDDS.deleteMany({ where: { oficialId } });
    await prisma.oficial.deleteMany({ where: { id: oficialId } });
    await prisma.$disconnect();
  });

  describe('authenticate', () => {
    it('llama a next() si el token es válido', () => {
      const req = {
        headers: { authorization: `Bearer ${oficialToken}` },
      } as unknown as Request;
      
      let nextCalled = false;
      const res = {} as unknown as Response;
      const next = (() => { nextCalled = true; }) as NextFunction;

      authenticate(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.usuario).toBeDefined();
      expect(req.usuario?.rol).toBe('OFICIAL');
    });

    it('devuelve 401 si no hay encabezado de autorización', () => {
      const req = { headers: {} } as unknown as Request;
      let statusSent = 0;
      let jsonSent = {};
      const res = {
        status: (code: number) => {
          statusSent = code;
          return {
            json: (data: any) => { jsonSent = data; }
          };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      authenticate(req, res, next);
      expect(statusSent).toBe(401);
      expect(jsonSent).toHaveProperty('error');
    });

    it('devuelve 401 si el token es inválido o no tiene formato Bearer', () => {
      const req = { headers: { authorization: 'InvalidToken' } } as unknown as Request;
      let statusSent = 0;
      const res = {
        status: (code: number) => {
          statusSent = code;
          return { json: () => {} };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      authenticate(req, res, next);
      expect(statusSent).toBe(401);
    });

    it('devuelve 401 si el token no puede ser verificado', () => {
      const req = { headers: { authorization: 'Bearer bad.token.here' } } as unknown as Request;
      let statusSent = 0;
      const res = {
        status: (code: number) => {
          statusSent = code;
          return { json: () => {} };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      authenticate(req, res, next);
      expect(statusSent).toBe(401);
    });
  });

  describe('authorize', () => {
    it('llama a next() si el rol está permitido', () => {
      const req = {
        usuario: { id: '1', email: 'o@test.com', rol: 'OFICIAL' },
      } as unknown as Request;

      let nextCalled = false;
      const res = {} as unknown as Response;
      const next = (() => { nextCalled = true; }) as NextFunction;

      authorize(['OFICIAL'])(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('devuelve 403 si el rol no está permitido', () => {
      const req = {
        usuario: { id: '1', email: 'o@test.com', rol: 'OFICIAL' },
      } as unknown as Request;

      let statusSent = 0;
      const res = {
        status: (code: number) => {
          statusSent = code;
          return { json: () => {} };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      authorize(['SUPERVISOR'])(req, res, next);
      expect(statusSent).toBe(403);
    });

    it('devuelve 401 si req.usuario no está definido (cubre línea 35-43)', () => {
      const req = {} as unknown as Request;
      let statusSent = 0;
      const res = {
        status: (code: number) => {
          statusSent = code;
          return { json: () => {} };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      authorize(['OFICIAL'])(req, res, next);
      expect(statusSent).toBe(401);
    });
  });

  describe('checkEdicionFormulario', () => {
    it('llama a next() si req.params.id no está definido (cubre línea 65-68)', async () => {
      const req = { params: {} } as unknown as Request;
      let nextCalled = false;
      const res = {} as unknown as Response;
      const next = (() => { nextCalled = true; }) as NextFunction;

      await checkEdicionFormulario(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('devuelve 404 si el formulario no existe', async () => {
      const req = {
        params: { id: '00000000-0000-0000-0000-000000000000' },
      } as unknown as Request;

      let statusSent = 0;
      const res = {
        status: (code: number) => {
          statusSent = code;
          return { json: () => {} };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      await checkEdicionFormulario(req, res, next);
      expect(statusSent).toBe(404);
    });

    it('devuelve 403 si el estado es APROBADO y el usuario es OFICIAL', async () => {
      const form = await prisma.formularioDDS.create({
        data: {
          proposito: 'Form Aprobado',
          estado: 'APROBADO',
          oficialId,
        },
      });

      const req = {
        params: { id: form.id },
        usuario: { id: oficialId, email: 'o@test.com', rol: 'OFICIAL' },
      } as unknown as Request;

      let statusSent = 0;
      const res = {
        status: (code: number) => {
          statusSent = code;
          return { json: () => {} };
        }
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      await checkEdicionFormulario(req, res, next);
      expect(statusSent).toBe(403);
    });
  });
});
