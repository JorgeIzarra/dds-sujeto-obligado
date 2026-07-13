import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/prisma-client';
import { verificarPassword } from '../../security/hash.service';
import { signToken } from '../../security/jwt.service';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';

const auditoriaRepo = new AuditoriaRepository(prisma);

const LoginSchema = z.object({
  email: z.string().email('Formato de correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: {
        codigo: 'CAMPOS_INVALIDOS',
        mensaje: 'Campos obligatorios inválidos o ausentes',
        campos: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { email, password } = parsed.data;

  const oficial = await prisma.oficial.findUnique({ where: { email } });
  if (!oficial) {
    res.status(401).json({
      error: {
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'El correo o la contraseña son incorrectos (SPEC-API-01)',
      },
    });
    return;
  }

  const isPasswordValid = await verificarPassword(password, oficial.hashPassword);
  if (!isPasswordValid) {
    res.status(401).json({
      error: {
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'El correo o la contraseña son incorrectos (SPEC-API-01)',
      },
    });
    return;
  }

  const rol = oficial.cargo as 'OFICIAL' | 'SUPERVISOR';
  const token = signToken({
    id: oficial.id,
    email: oficial.email,
    rol,
  });

  // SPEC-SEC-04: Auditoría de acceso
  await auditoriaRepo.registrarEvento({
    accion: 'ACCEDER',
    entidad: 'oficial',
    entidadId: oficial.id,
    usuarioId: oficial.id,
    detalle: { email: oficial.email },
  });

  res.status(200).json({ token, rol });
}
