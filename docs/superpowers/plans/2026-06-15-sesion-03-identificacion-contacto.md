# Sesión 3 — Identificación y Contacto: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar PUT /api/formularios/:id/identificacion (RF-01) y PUT /api/formularios/:id/contacto (RF-02) con validación de cédula panameña (SPEC-RN-02), campos obligatorios (RF-08), auditoría sin auth (SPEC-SEC-04), y activar umbral de cobertura 80%.

**Architecture:** Capa `domain` (funciones puras: `esCedulaValida`, `validarDocumentoGenerico`, `validarCorreo`, `validarTelefono`) → capa `infrastructure` (singleton PrismaClient, `AuditoriaRepository`, `ContactoRepository`, extensión de `ClienteRepository`) → capa `interfaces` (controllers con validación Zod en el borde + Express router). Sin auth middleware (Sesión 6); `log_auditoria.usuarioId = null` hasta entonces. Vistas EJS diferidas.

**Tech Stack:** Node.js 22 + TypeScript + Express 4, Prisma 5 + PostgreSQL, Zod (nuevo), Vitest 4 + Supertest, coverage v8.

**Decisiones bloqueadas antes de implementar:**
- VOL-S3-01: `tipoDocumento` acepta `CEDULA | PASAPORTE | RUC` (catálogo concreto; la spec lo dejaba abierto).
- `esCedulaValida` solo aplica cuando `tipoDocumento === 'CEDULA'`. Los otros tipos solo requieren alphanúmerico razonable.
- `log_auditoria.usuarioId = null` hasta Sesión 6. El evento SE escribe en cada mutación.
- Vistas EJS diferidas; esta sesión es API-only. Documentar como diferido en sesion-03.md.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/domain/validaciones.ts` | Crear | Funciones puras: `esCedulaValida`, `validarDocumentoGenerico`, `validarCorreo`, `validarTelefono` |
| `src/infrastructure/prisma-client.ts` | Crear | Singleton `PrismaClient` compartido por controllers |
| `src/infrastructure/repositories/auditoria.repository.ts` | Crear | `AuditoriaRepository.registrarEvento()` (SPEC-SEC-04) |
| `src/infrastructure/repositories/contacto.repository.ts` | Crear | `ContactoRepository.upsertByFormularioId()` |
| `src/infrastructure/repositories/cliente.repository.ts` | Modificar | Añadir `upsertByFormularioId()` |
| `src/interfaces/controllers/identificacion.controller.ts` | Crear | Handler PUT /api/formularios/:id/identificacion |
| `src/interfaces/controllers/contacto.controller.ts` | Crear | Handler PUT /api/formularios/:id/contacto |
| `src/interfaces/routes/formularios.routes.ts` | Crear (Task 7) / Modificar (Task 9) | Express router; se completa en dos pasos |
| `src/interfaces/app.ts` | Modificar | Montar router en `/api/formularios` |
| `vitest.config.ts` | Modificar | Activar `thresholds: { lines: 80, functions: 80 }` |
| `tests/unit/validaciones.test.ts` | Crear | Unit tests de las 4 funciones puras |
| `tests/integration/identificacion.test.ts` | Crear | Integration tests PUT /identificacion (8 casos) |
| `tests/integration/contacto.test.ts` | Crear | Integration tests PUT /contacto (7 casos) |
| `docs/sesiones/sesion-03.md` | Crear | Documento de cierre con métricas reales |

---

## Task 1: Crear rama sesion-3 e instalar Zod

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Crear la rama**

```bash
git checkout -b sesion-3
```
Expected: `Switched to a new branch 'sesion-3'`

- [ ] **Step 2: Instalar Zod**

```bash
npm install zod
```
Expected: `added 1 package` (zod ~3.x)

- [ ] **Step 3: Verificar que los tests existentes siguen en verde**

```bash
npm run test
```
Expected: `25 passed (25)` — sin regresión.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(s03): rama sesion-3 e instalar zod (SPEC-SEC-02)"
```

---

## Task 2: Domain — funciones puras de validación (TDD)

**Files:**
- Create: `tests/unit/validaciones.test.ts`
- Create: `src/domain/validaciones.ts`

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe aún)**

Crear `tests/unit/validaciones.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  esCedulaValida,
  validarDocumentoGenerico,
  validarCorreo,
  validarTelefono,
} from '../../src/domain/validaciones';

// --- esCedulaValida (SPEC-RN-02, DEF001) ---
describe('esCedulaValida', () => {
  it('acepta 8-123-4567', () => expect(esCedulaValida('8-123-4567')).toBe(true));
  it('acepta 1-1234-123456 (1-4-6 dígitos)', () => expect(esCedulaValida('1-1234-123456')).toBe(true));
  it('acepta 12-1234-123456 (2 dígitos en primera parte)', () => expect(esCedulaValida('12-1234-123456')).toBe(true));
  it('rechaza 12345 sin guiones (SPEC-BHV-03)', () => expect(esCedulaValida('12345')).toBe(false));
  it('rechaza cadena vacía', () => expect(esCedulaValida('')).toBe(false));
  it('rechaza letras en el número', () => expect(esCedulaValida('A-123-4567')).toBe(false));
  it('rechaza puntos como separadores', () => expect(esCedulaValida('8.123.4567')).toBe(false));
  it('rechaza un solo guión 8-1234567', () => expect(esCedulaValida('8-1234567')).toBe(false));
});

// --- validarDocumentoGenerico (VOL-S3-01: PASAPORTE, RUC) ---
describe('validarDocumentoGenerico', () => {
  it('acepta alfanumérico A1234567', () => expect(validarDocumentoGenerico('A1234567')).toBe(true));
  it('acepta con guiones RUC-12345', () => expect(validarDocumentoGenerico('RUC-12345')).toBe(true));
  it('rechaza cadena vacía', () => expect(validarDocumentoGenerico('')).toBe(false));
  it('rechaza espacios internos', () => expect(validarDocumentoGenerico('A 1234')).toBe(false));
  it('rechaza caracteres especiales !', () => expect(validarDocumentoGenerico('A!1234')).toBe(false));
});

// --- validarCorreo (RF-02) ---
describe('validarCorreo', () => {
  it('acepta user@example.com', () => expect(validarCorreo('user@example.com')).toBe(true));
  it('acepta nombre+tag@dominio.org', () => expect(validarCorreo('nombre+tag@dominio.org')).toBe(true));
  it('rechaza sin @', () => expect(validarCorreo('userexample.com')).toBe(false));
  it('rechaza cadena vacía', () => expect(validarCorreo('')).toBe(false));
  it('rechaza sin dominio tras @', () => expect(validarCorreo('user@')).toBe(false));
});

// --- validarTelefono (RF-02) ---
describe('validarTelefono', () => {
  it('acepta +507 6123-4567', () => expect(validarTelefono('+507 6123-4567')).toBe(true));
  it('acepta 6000-1234', () => expect(validarTelefono('6000-1234')).toBe(true));
  it('acepta 61234567 (solo dígitos)', () => expect(validarTelefono('61234567')).toBe(true));
  it('rechaza cadena vacía', () => expect(validarTelefono('')).toBe(false));
  it('rechaza solo letras abc', () => expect(validarTelefono('abc')).toBe(false));
  it('rechaza menos de 7 caracteres 123', () => expect(validarTelefono('123')).toBe(false));
});
```

- [ ] **Step 2: Correr y verificar que FALLA**

```bash
npm run test -- tests/unit/validaciones.test.ts
```
Expected: `FAIL` — `Cannot find module '../../src/domain/validaciones'`

- [ ] **Step 3: Implementar `src/domain/validaciones.ts`**

```typescript
// SPEC-RN-02 (DEF001): validación de formato de cédula panameña X-XXXX-XXXXXX
// VOL-S3-01: catálogo tipoDocumento = CEDULA | PASAPORTE | RUC
const CEDULA_REGEX = /^\d{1,2}-\d{1,4}-\d{1,6}$/;
const DOCUMENTO_GENERICO_REGEX = /^[A-Za-z0-9\-]{1,40}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^\+?[\d\s\-()]{7,20}$/;

export function esCedulaValida(valor: string): boolean {
  return CEDULA_REGEX.test(valor);
}

export function validarDocumentoGenerico(valor: string): boolean {
  return DOCUMENTO_GENERICO_REGEX.test(valor);
}

export function validarCorreo(valor: string): boolean {
  return CORREO_REGEX.test(valor);
}

export function validarTelefono(valor: string): boolean {
  return TELEFONO_REGEX.test(valor);
}
```

- [ ] **Step 4: Correr y verificar que PASA**

```bash
npm run test -- tests/unit/validaciones.test.ts
```
Expected: `23 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/domain/validaciones.ts tests/unit/validaciones.test.ts
git commit -m "feat(domain): funciones puras de validación (SPEC-RN-02, DEF001, VOL-S3-01)"
```

---

## Task 3: Infrastructure — PrismaClient singleton + AuditoriaRepository

**Files:**
- Create: `src/infrastructure/prisma-client.ts`
- Create: `src/infrastructure/repositories/auditoria.repository.ts`

- [ ] **Step 1: Crear `src/infrastructure/prisma-client.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 2: Crear `src/infrastructure/repositories/auditoria.repository.ts`**

```typescript
// SPEC-SEC-04: auditoría obligatoria en toda mutación (RNF-05, Art. 55)
// usuarioId es null hasta Sesión 6 (autenticación JWT)
import { PrismaClient } from '@prisma/client';

interface EventoAuditoria {
  accion: string;
  entidad: string;
  entidadId?: string;
  usuarioId: string | null;
  detalle?: Record<string, unknown>;
}

export class AuditoriaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async registrarEvento(evento: EventoAuditoria): Promise<void> {
    await this.prisma.logAuditoria.create({
      data: {
        accion: evento.accion,
        entidad: evento.entidad,
        entidadId: evento.entidadId ?? null,
        usuarioId: evento.usuarioId,
        detalle: evento.detalle ?? null,
      },
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/prisma-client.ts src/infrastructure/repositories/auditoria.repository.ts
git commit -m "feat(infra): PrismaClient singleton y AuditoriaRepository (SPEC-SEC-04)"
```

---

## Task 4: Infrastructure — ClienteRepository.upsertByFormularioId

**Files:**
- Modify: `src/infrastructure/repositories/cliente.repository.ts:1-37`

- [ ] **Step 1: Añadir `upsertByFormularioId` al final de `ClienteRepository`**

El archivo completo queda así (reemplazar el contenido entero):

```typescript
// Repositorio de Cliente — aplica cifrado/descifrado AES-256-GCM (SPEC-SEC-01)
// Los campos nombre y numDocumento se cifran antes de persistir y se descifran al leer.
import { PrismaClient, Cliente, Prisma } from '@prisma/client';
import { encrypt, decrypt } from '../../security/crypto.service';

export class ClienteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.ClienteUncheckedCreateInput): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: {
        ...data,
        nombre: encrypt(data.nombre),
        numDocumento: encrypt(data.numDocumento),
      },
    });
  }

  async findById(id: string): Promise<Cliente | null> {
    const row = await this.prisma.cliente.findUnique({ where: { id } });
    if (!row) return null;
    return {
      ...row,
      nombre: decrypt(row.nombre),
      numDocumento: decrypt(row.numDocumento),
    };
  }

  async findByFormularioId(formularioId: string): Promise<Cliente[]> {
    const rows = await this.prisma.cliente.findMany({ where: { formularioId } });
    return rows.map((row) => ({
      ...row,
      nombre: decrypt(row.nombre),
      numDocumento: decrypt(row.numDocumento),
    }));
  }

  // Crea el cliente si no existe para este formulario; lo actualiza si ya existe (RF-01)
  async upsertByFormularioId(
    formularioId: string,
    data: Omit<Prisma.ClienteUncheckedCreateInput, 'formularioId'>,
  ): Promise<Cliente> {
    const existing = await this.prisma.cliente.findFirst({ where: { formularioId } });
    if (existing) {
      const updated = await this.prisma.cliente.update({
        where: { id: existing.id },
        data: {
          ...data,
          nombre: encrypt(data.nombre),
          numDocumento: encrypt(data.numDocumento),
        },
      });
      return {
        ...updated,
        nombre: data.nombre as string,
        numDocumento: data.numDocumento as string,
      };
    }
    return this.create({ formularioId, ...data });
  }
}
```

- [ ] **Step 2: Verificar que los tests de Sesión 2 siguen en verde (no hay regresión)**

```bash
npm run test -- tests/unit/cifrado.test.ts tests/integration/cliente-repo.test.ts tests/integration/cifrado.test.ts
```
Expected: `9 tests passed` — sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/repositories/cliente.repository.ts
git commit -m "feat(infra): ClienteRepository.upsertByFormularioId (RF-01, SPEC-API-03)"
```

---

## Task 5: Infrastructure — ContactoRepository

**Files:**
- Create: `src/infrastructure/repositories/contacto.repository.ts`

- [ ] **Step 1: Crear `src/infrastructure/repositories/contacto.repository.ts`**

```typescript
// ContactoRepository — persiste DatosContacto (RF-02, SPEC-API-04)
// Sin cifrado: la spec SPEC-SEC-01 solo cifra cliente.nombre y cliente.numDocumento.
import { PrismaClient, DatosContacto } from '@prisma/client';

interface ContactoInput {
  direccion: string;
  telefono: string;
  correo: string;
}

export class ContactoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByFormularioId(formularioId: string, data: ContactoInput): Promise<DatosContacto> {
    const existing = await this.prisma.datosContacto.findFirst({ where: { formularioId } });
    if (existing) {
      return this.prisma.datosContacto.update({
        where: { id: existing.id },
        data: { ...data, fechaVerif: new Date() },
      });
    }
    return this.prisma.datosContacto.create({ data: { formularioId, ...data } });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/repositories/contacto.repository.ts
git commit -m "feat(infra): ContactoRepository.upsertByFormularioId (RF-02, SPEC-API-04)"
```

---

## Task 6: Integration test para PUT /identificacion — escribir PRIMERO (falla)

**Files:**
- Create: `tests/integration/identificacion.test.ts`

- [ ] **Step 1: Crear `tests/integration/identificacion.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let formularioId: string;
let oficialId: string;

beforeAll(async () => {
  app = createApp();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Test ID',
      cargo: 'OFICIAL',
      email: `test-id-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test identificacion', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { id: formularioId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

const bodyValido = {
  nombre: 'Juan Pérez',
  tipoDocumento: 'CEDULA',
  numDocumento: '8-123-4567',
  nacionalidad: 'Panameña',
  tipoCliente: 'NATURAL',
  esPEP: false,
};

describe('PUT /api/formularios/:id/identificacion (SPEC-API-03, RF-01)', () => {
  it('200 con datos válidos — cédula correcta (SPEC-BHV-03 happy path)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send(bodyValido);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('200 idempotente — segunda llamada actualiza sin error (upsert)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send({ ...bodyValido, nombre: 'Juan Carlos Pérez' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('422 — cédula con formato inválido (SPEC-BHV-03)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send({ ...bodyValido, numDocumento: '12345' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CEDULA_INVALIDA');
    expect(res.body.error.mensaje).toMatch(/SPEC-RN-02/);
    expect(res.body.error.campos).toHaveProperty('numDocumento');
  });

  it('422 — nombre ausente (SPEC-BHV-04, RF-08)', async () => {
    const { nombre: _n, ...sinNombre } = bodyValido;
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send(sinNombre);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('nombre');
  });

  it('422 — tipoCliente inválido (SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send({ ...bodyValido, tipoCliente: 'INVALIDO' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('tipoCliente');
  });

  it('200 — PASAPORTE acepta documento alfanumérico sin patrón cédula (VOL-S3-01)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send({ ...bodyValido, tipoDocumento: 'PASAPORTE', numDocumento: 'A1234567' });
    expect(res.status).toBe(200);
  });

  it('registra evento MODIFICAR en log_auditoria con usuarioId null (SPEC-SEC-04)', async () => {
    const countBefore = await prisma.logAuditoria.count();
    await request(app)
      .put(`/api/formularios/${formularioId}/identificacion`)
      .send({ ...bodyValido, nombre: 'Ana Torres' });
    const countAfter = await prisma.logAuditoria.count();
    expect(countAfter).toBe(countBefore + 1);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'cliente', accion: 'MODIFICAR' },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBeNull();
  });

  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .put('/api/formularios/00000000-0000-0000-0000-000000000000/identificacion')
      .send(bodyValido);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });
});
```

- [ ] **Step 2: Correr y verificar que FALLA (ruta no existe)**

```bash
npm run test -- tests/integration/identificacion.test.ts
```
Expected: `FAIL` — los tests que esperan 200/422/404 reciben respuestas inesperadas porque la ruta aún no existe.

---

## Task 7: Implementar PUT /identificacion — controller + route + montar en app

**Files:**
- Create: `src/interfaces/controllers/identificacion.controller.ts`
- Create: `src/interfaces/routes/formularios.routes.ts`
- Modify: `src/interfaces/app.ts`

- [ ] **Step 1: Crear `src/interfaces/controllers/identificacion.controller.ts`**

```typescript
// PUT /api/formularios/:id/identificacion (RF-01, SPEC-API-03)
// Validación Zod en el borde del controlador (SPEC-SEC-02); reglas de negocio después
import { Request, Response } from 'express';
import { z } from 'zod';
import { ClienteRepository } from '../../infrastructure/repositories/cliente.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { esCedulaValida, validarDocumentoGenerico } from '../../domain/validaciones';
import { prisma } from '../../infrastructure/prisma-client';

const clienteRepo = new ClienteRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);

const IdentificacionSchema = z.object({
  nombre: z.string().min(1, 'nombre es obligatorio'),
  tipoDocumento: z.enum(['CEDULA', 'PASAPORTE', 'RUC']),
  numDocumento: z.string().min(1, 'numDocumento es obligatorio'),
  fechaNacimiento: z.string().optional(),
  nacionalidad: z.string().min(1, 'nacionalidad es obligatoria'),
  tipoCliente: z.enum(['NATURAL', 'JURIDICA']),
  esPEP: z.boolean(),
});

export async function putIdentificacion(req: Request, res: Response): Promise<void> {
  const parsed = IdentificacionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: {
        codigo: 'CAMPOS_INVALIDOS',
        mensaje: 'Campos obligatorios inválidos o ausentes (RF-08)',
        campos: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const data = parsed.data;

  // SPEC-RN-02: regex de cédula solo cuando tipoDocumento === 'CEDULA' (VOL-S3-01)
  if (data.tipoDocumento === 'CEDULA' && !esCedulaValida(data.numDocumento)) {
    res.status(422).json({
      error: {
        codigo: 'CEDULA_INVALIDA',
        mensaje: 'El número de cédula no cumple el formato X-XXX-XXXX (SPEC-RN-02, DEF001)',
        campos: { numDocumento: ['Formato de cédula panameña inválido'] },
      },
    });
    return;
  }

  if (data.tipoDocumento !== 'CEDULA' && !validarDocumentoGenerico(data.numDocumento)) {
    res.status(422).json({
      error: {
        codigo: 'DOCUMENTO_INVALIDO',
        mensaje: 'numDocumento contiene caracteres no permitidos (VOL-S3-01)',
        campos: { numDocumento: ['Solo se permiten caracteres alfanuméricos y guiones'] },
      },
    });
    return;
  }

  const formulario = await prisma.formularioDDS.findUnique({ where: { id: req.params.id } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  const cliente = await clienteRepo.upsertByFormularioId(req.params.id, {
    nombre: data.nombre,
    tipoDocumento: data.tipoDocumento,
    numDocumento: data.numDocumento,
    fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
    nacionalidad: data.nacionalidad,
    tipoCliente: data.tipoCliente,
    esPep: data.esPEP,
  });

  // SPEC-SEC-04: auditoría obligatoria; usuarioId null hasta Sesión 6
  await auditoriaRepo.registrarEvento({
    accion: 'MODIFICAR',
    entidad: 'cliente',
    entidadId: cliente.id,
    usuarioId: null,
    detalle: { tipoDocumento: data.tipoDocumento, formularioId: req.params.id },
  });

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Crear `src/interfaces/routes/formularios.routes.ts` (solo /identificacion por ahora)**

```typescript
import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';

const router = Router();

router.put('/:id/identificacion', putIdentificacion);

export { router as formulariosRouter };
```

- [ ] **Step 3: Modificar `src/interfaces/app.ts` para montar el router**

```typescript
import express, { Application, Request, Response } from 'express';
import path from 'path';
import { formulariosRouter } from './routes/formularios.routes';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'src', 'interfaces', 'views'));

  app.get('/health', (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/formularios', formulariosRouter);

  return app;
}
```

- [ ] **Step 4: Correr los tests de identificación y verificar que PASAN**

```bash
npm run test -- tests/integration/identificacion.test.ts
```
Expected: `8 tests passed`

- [ ] **Step 5: Verificar no hay regresión en tests anteriores**

```bash
npm run test -- tests/unit/health.test.ts tests/unit/validaciones.test.ts
```
Expected: `24 tests passed`

- [ ] **Step 6: Commit**

```bash
git add src/interfaces/controllers/identificacion.controller.ts \
        src/interfaces/routes/formularios.routes.ts \
        src/interfaces/app.ts
git commit -m "feat(api): PUT /identificacion con validación Zod y auditoría (RF-01, SPEC-API-03, SPEC-BHV-03/04)"
```

---

## Task 8: Integration test para PUT /contacto — escribir PRIMERO (falla)

**Files:**
- Create: `tests/integration/contacto.test.ts`

- [ ] **Step 1: Crear `tests/integration/contacto.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/interfaces/app';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let formularioId: string;
let oficialId: string;

beforeAll(async () => {
  app = createApp();
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Oficial Test Contacto',
      cargo: 'OFICIAL',
      email: `test-contacto-${Date.now()}@test.com`,
      hashPassword: 'hash',
    },
  });
  oficialId = oficial.id;
  const formulario = await prisma.formularioDDS.create({
    data: { proposito: 'Test contacto', oficialId },
  });
  formularioId = formulario.id;
});

afterAll(async () => {
  await prisma.formularioDDS.deleteMany({ where: { id: formularioId } });
  await prisma.oficial.deleteMany({ where: { id: oficialId } });
  await prisma.$disconnect();
});

const bodyValido = {
  direccion: 'Calle 50, Ciudad de Panamá',
  telefono: '+507 6123-4567',
  correo: 'juan@example.com',
};

describe('PUT /api/formularios/:id/contacto (SPEC-API-04, RF-02)', () => {
  it('200 con datos válidos', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send(bodyValido);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('200 idempotente — segunda llamada actualiza sin error (upsert)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send({ ...bodyValido, correo: 'juan2@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('422 — correo inválido (RF-02, SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send({ ...bodyValido, correo: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('correo');
  });

  it('422 — teléfono inválido (RF-02, SPEC-SEC-02)', async () => {
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send({ ...bodyValido, telefono: 'abc' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('telefono');
  });

  it('422 — dirección ausente (RF-08, SPEC-SEC-02)', async () => {
    const { direccion: _d, ...sinDireccion } = bodyValido;
    const res = await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send(sinDireccion);
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('CAMPOS_INVALIDOS');
    expect(res.body.error.campos).toHaveProperty('direccion');
  });

  it('registra evento MODIFICAR en log_auditoria con usuarioId null (SPEC-SEC-04)', async () => {
    const countBefore = await prisma.logAuditoria.count();
    await request(app)
      .put(`/api/formularios/${formularioId}/contacto`)
      .send(bodyValido);
    const countAfter = await prisma.logAuditoria.count();
    expect(countAfter).toBe(countBefore + 1);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidad: 'datos_contacto', accion: 'MODIFICAR' },
      orderBy: { timestamp: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.usuarioId).toBeNull();
  });

  it('404 — formulario inexistente', async () => {
    const res = await request(app)
      .put('/api/formularios/00000000-0000-0000-0000-000000000000/contacto')
      .send(bodyValido);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('FORMULARIO_NO_ENCONTRADO');
  });
});
```

- [ ] **Step 2: Correr y verificar que FALLA (ruta no existe)**

```bash
npm run test -- tests/integration/contacto.test.ts
```
Expected: `FAIL` — la ruta `/:id/contacto` no está registrada todavía.

---

## Task 9: Implementar PUT /contacto — controller + añadir al router

**Files:**
- Create: `src/interfaces/controllers/contacto.controller.ts`
- Modify: `src/interfaces/routes/formularios.routes.ts`

- [ ] **Step 1: Crear `src/interfaces/controllers/contacto.controller.ts`**

```typescript
// PUT /api/formularios/:id/contacto (RF-02, SPEC-API-04)
// Validación Zod en el borde del controlador (SPEC-SEC-02)
import { Request, Response } from 'express';
import { z } from 'zod';
import { ContactoRepository } from '../../infrastructure/repositories/contacto.repository';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';
import { validarTelefono } from '../../domain/validaciones';
import { prisma } from '../../infrastructure/prisma-client';

const contactoRepo = new ContactoRepository(prisma);
const auditoriaRepo = new AuditoriaRepository(prisma);

const ContactoSchema = z.object({
  direccion: z.string().min(1, 'direccion es obligatoria'),
  telefono: z.string().refine(validarTelefono, 'teléfono con formato inválido'),
  correo: z.string().email('correo electrónico inválido'),
});

export async function putContacto(req: Request, res: Response): Promise<void> {
  const parsed = ContactoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: {
        codigo: 'CAMPOS_INVALIDOS',
        mensaje: 'Campos obligatorios inválidos o ausentes (RF-08)',
        campos: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const formulario = await prisma.formularioDDS.findUnique({ where: { id: req.params.id } });
  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  const contacto = await contactoRepo.upsertByFormularioId(req.params.id, parsed.data);

  // SPEC-SEC-04: auditoría obligatoria; usuarioId null hasta Sesión 6
  await auditoriaRepo.registrarEvento({
    accion: 'MODIFICAR',
    entidad: 'datos_contacto',
    entidadId: contacto.id,
    usuarioId: null,
    detalle: { formularioId: req.params.id },
  });

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Modificar `src/interfaces/routes/formularios.routes.ts` para añadir la ruta /contacto**

```typescript
import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';
import { putContacto } from '../controllers/contacto.controller';

const router = Router();

router.put('/:id/identificacion', putIdentificacion);
router.put('/:id/contacto', putContacto);

export { router as formulariosRouter };
```

- [ ] **Step 3: Correr los tests de contacto y verificar que PASAN**

```bash
npm run test -- tests/integration/contacto.test.ts
```
Expected: `7 tests passed`

- [ ] **Step 4: Correr la suite completa y verificar que no hay regresión**

```bash
npm run test
```
Expected: todos los tests pasan (`25 anteriores + 23 domain + 8 identificacion + 7 contacto = 63 tests`)

- [ ] **Step 5: Commit**

```bash
git add src/interfaces/controllers/contacto.controller.ts \
        src/interfaces/routes/formularios.routes.ts
git commit -m "feat(api): PUT /contacto con validación Zod y auditoría (RF-02, SPEC-API-04)"
```

---

## Task 10: Activar umbral de cobertura al 80%

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Activar thresholds en `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },
  },
});
```

- [ ] **Step 2: Correr con cobertura y verificar que supera el umbral**

```bash
npm run test:coverage
```
Expected: cobertura ≥ 80% en líneas y funciones en todos los archivos de `src/`.
Si algún archivo queda por debajo, añadir tests dirigidos (ciclo de medición §7.1 de Sesión 2).

Tabla esperada mínima:
```
src/domain/validaciones.ts          — cubierto 100% por tests/unit/validaciones.test.ts
src/security/crypto.service.ts      — 100% (heredado)
src/infrastructure/repositories/
  cliente.repository.ts             — ≥ 80% (nuevo método cubierto por integración)
  auditoria.repository.ts           — ≥ 80% (cubierto por integración)
  contacto.repository.ts            — ≥ 80% (cubierto por integración)
src/infrastructure/prisma-client.ts — ≥ 80% (cargado por cada test de integración)
src/interfaces/controllers/
  identificacion.controller.ts      — ≥ 80% (cubierto por integración)
  contacto.controller.ts            — ≥ 80% (cubierto por integración)
src/interfaces/routes/
  formularios.routes.ts             — ≥ 80%
src/interfaces/app.ts               — ≥ 80% (cubierto por health.test.ts + integración)
```

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(s03): activar umbral de cobertura 80% lines/functions (Sesión 3)"
```

---

## Task 11: Documento de cierre docs/sesiones/sesion-03.md

**Files:**
- Create: `docs/sesiones/sesion-03.md`

- [ ] **Step 1: Recolectar métricas reales**

```bash
# Cobertura
npm run test:coverage

# KLOC nuevos src/ esta sesión
git diff main --stat -- 'src/**/*.ts' | tail -1
```

- [ ] **Step 2: Crear `docs/sesiones/sesion-03.md` con la plantilla completa**

Completar TODA la plantilla del PLAN_SESIONES.md. Campos obligatorios:
- §2 Trabajo realizado: tabla con cada archivo creado/modificado.
- §3 Requisitos abordados: RF-01, RF-02, RF-08; SPEC-API-03/04, SPEC-RN-02, SPEC-BHV-03/04.
- §4 Decisiones técnicas: VOL-S3-01 (catálogo tipoDocumento), vistas EJS diferidas, usuarioId null.
- §5 Controles de seguridad: SPEC-SEC-02 (Zod en borde), SPEC-SEC-04 (auditoría), SPEC-SEC-06 (sin secretos), SPEC-SEC-03 (Prisma parametrizado).
- §6 Métricas: KLOC reales, cobertura de Vitest, complejidad/code smells/vulns/debt marcados "Pendiente CI".
- §7 Defectos: DEF001 resuelto (cedula regex), plus cualquier defecto encontrado.
- §8 Pruebas: listar todos los tests añadidos.
- §9 Commits: hashes reales.
- §10 Pendientes: mencionar vistas EJS (diferidas), auth middleware (Sesión 6).

- [ ] **Step 3: Commit de cierre de sesión**

```bash
git add docs/sesiones/sesion-03.md
git commit -m "docs(sesion-03): cierre con métricas reales, VOL-S3-01 y controles de seguridad"
```

---

## Self-Review — Cobertura de specs

| Spec | Implementado en | Test |
|------|-----------------|------|
| SPEC-API-03 (PUT /identificacion) | `identificacion.controller.ts` | `identificacion.test.ts` |
| SPEC-API-04 (PUT /contacto) | `contacto.controller.ts` | `contacto.test.ts` |
| SPEC-RN-02 (esCedulaValida) | `validaciones.ts` | `validaciones.test.ts` + `identificacion.test.ts` |
| SPEC-SEC-02 (Zod, 422) | ambos controllers | ambos test de integración |
| SPEC-SEC-04 (auditoría) | `AuditoriaRepository` | ambos test (usuarioId null) |
| SPEC-SEC-06 (sin secretos) | heredado Sesión 1 | N/A |
| SPEC-SEC-03 (consultas parametrizadas) | Prisma ORM | heredado |
| SPEC-BHV-03 (cedula 422) | `identificacion.controller.ts` | `identificacion.test.ts` |
| SPEC-BHV-04 (campos vacíos 422) | ambos controllers | ambos test de integración |
| RF-08 (validación campos obligatorios) | Zod en ambos controllers | casos 422 en ambos test |
| VOL-S3-01 (catálogo tipoDocumento) | Zod enum + lógica de negocio | caso PASAPORTE en test |
| DEF001 (cedula regex) | `esCedulaValida` | `validaciones.test.ts` |

Gaps detectados: ninguno — todos los requisitos del alcance de Sesión 3 tienen test y código.
