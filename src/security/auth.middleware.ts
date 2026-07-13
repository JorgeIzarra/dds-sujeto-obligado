import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt.service';
import { prisma } from '../infrastructure/prisma-client';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Petición sin token o token inválido (SPEC-SEC-05)',
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: {
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Petición sin token o token inválido (SPEC-SEC-05)',
      },
    });
    return;
  }

  req.usuario = payload;
  next();
}

export function authorize(roles: ('OFICIAL' | 'SUPERVISOR')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        error: {
          codigo: 'NO_AUTENTICADO',
          mensaje: 'Petición sin token o token inválido (SPEC-SEC-05)',
        },
      });
      return;
    }

    if (!roles.includes(req.usuario.rol)) {
      res.status(403).json({
        error: {
          codigo: 'NO_AUTORIZADO',
          mensaje: 'Rol insuficiente para realizar esta acción (SPEC-SEC-05)',
        },
      });
      return;
    }

    next();
  };
}

export async function checkEdicionFormulario(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { id } = req.params;
  if (!id) {
    next();
    return;
  }

  const formulario = await prisma.formularioDDS.findUnique({ where: { id } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  if (formulario.estado === 'APROBADO' && req.usuario?.rol === 'OFICIAL') {
    res.status(403).json({
      error: {
        codigo: 'NO_AUTORIZADO',
        mensaje: 'Un formulario aprobado solo se edita con autorización de Supervisor (RN-06)',
      },
    });
    return;
  }

  next();
}
