// SPEC-API-09 — Búsqueda (resuelve DEF004; SPEC-SEC-03)
import { Request, Response } from 'express';
import { prisma } from '../../infrastructure/prisma-client';
import { decrypt } from '../../security/crypto.service';

export async function getFormularios(req: Request, res: Response): Promise<void> {
  const folioQuery = req.query.folio as string | undefined;
  const nombreQuery = req.query.nombre as string | undefined;

  // Realizar la consulta a la BD utilizando Prisma (consulta parametrizada por defecto)
  const formularios = await prisma.formularioDDS.findMany({
    where: folioQuery
      ? {
          folio: {
            contains: folioQuery,
            mode: 'insensitive',
          },
        }
      : undefined,
    include: {
      clientes: true,
    },
  });

  const results = formularios.map((f) => {
    // Decodificar y descifrar el nombre del cliente (cifrado en reposo con IV aleatorio)
    const clientesDecrypted = f.clientes.map((c) => ({
      ...c,
      nombre: decrypt(c.nombre),
      numDocumento: decrypt(c.numDocumento),
    }));

    return {
      id: f.id,
      folio: f.folio,
      nombre: clientesDecrypted[0]?.nombre || '',
      clasificacionRiesgo: f.clasificacionRiesgo,
      fecha: f.fecha.toISOString().split('T')[0], // yyyy-mm-dd
    };
  });

  // Filtrado final en memoria por nombre (debido a cifrado no determinístico)
  let filteredResults = results;
  if (nombreQuery) {
    const q = nombreQuery.toLowerCase();
    filteredResults = results.filter((r) => r.nombre.toLowerCase().includes(q));
  }

  res.status(200).json(filteredResults);
}
