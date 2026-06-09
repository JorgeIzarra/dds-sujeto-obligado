# Sesión 02 — Modelo de datos y persistencia

**Fecha:** 2026-06-08
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** (completar al cerrar la sesión)

---

## 1. Objetivo de la sesión

Definir el esquema de base de datos completo según SPEC-DATA-01..03, generar la primera
migración de PostgreSQL, implementar el cifrado en reposo AES-256-GCM para campos PII
(SPEC-SEC-01) y validarlo con tests de integración contra la BD dockerizada.

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Schema Prisma con 7 modelos | `prisma/schema.prisma` | `Oficial`, `FormularioDDS`, `Cliente`, `DatosContacto`, `PerfilEconomico`, `Documento`, `LogAuditoria` |
| Migración SQL + SEQUENCE | `prisma/migrations/20260608000000_.../migration.sql`, `migration_lock.toml` | `CREATE SEQUENCE seq_folio_dds START 1;` añadida manualmente a la migración generada por `prisma migrate diff` |
| Migración aplicada a BD Docker | BD `dds_db` en `postgres:16-alpine` | 7 tablas + `_prisma_migrations` + secuencia confirmadas vía `\dt` y `information_schema.sequences` |
| CryptoService (SPEC-SEC-01) | `src/security/crypto.service.ts` | AES-256-GCM; formato almacenado: IV(12 B) + authTag(16 B) + ciphertext → base64 |
| ClienteRepository | `src/infrastructure/repositories/cliente.repository.ts` | Cifra `nombre` y `numDocumento` antes de persistir; descifra al leer |
| Tests unitarios de cifrado | `tests/unit/cifrado.test.ts` | 6 tests: round-trip, IV aleatorio, integridad GCM, error sin clave, guard longitud clave |
| Tests de integración — entidades | `tests/integration/modelo.test.ts` | 12 tests: CRUD de los 7 modelos, UNIQUE de folio, CASCADE, secuencia |
| Tests de integración — cifrado en BD | `tests/integration/cifrado.test.ts` | 3 tests: SELECT directo ≠ plaintext; round-trip cifrado; descifrado en repo |
| Tests de integración — ramas repositorio | `tests/integration/cliente-repo.test.ts` | 3 tests: findById null, findByFormularioId con resultados, findByFormularioId vacío |
| Setup global de Vitest | `tests/setup.ts` | Carga `.env` con `process.loadEnvFile` (Node 22+); establece clave de prueba |
| `vitest.config.ts` | `vitest.config.ts` | Añadido `setupFiles: ['./tests/setup.ts']` |
| CI actualizado | `.github/workflows/ci.yml` | Quita `\|\| true`; añade `prisma migrate deploy`; añade `ENCRYPTION_KEY` al job |
| `docker-compose.yml` | `docker-compose.yml` | Puerto postgres cambiado a `5433:5432` (ver DEF-S2-01) |
| `.env.example` actualizado | `.env.example` | `ENCRYPTION_KEY` activa; puerto actualizado a 5433 |
| Volatilidades de spec documentadas | este documento §4 | VOL-S2-01, VOL-S2-02, VOL-S2-03 |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| SPEC-DATA-01 (formulario, folio UNIQUE, secuencia) | Completo | `seq_folio_dds` creada; `folio` UNIQUE; resolución de VOL-S2-03 (nullable) documentada |
| SPEC-DATA-02 (cliente, campos PII) | Completo | `nombre` y `numDocumento` cifrados; índice creado (VOL-S2-02) |
| SPEC-DATA-03 (contacto, perfil, documento, oficial, auditoría) | Completo | 5 tablas adicionales con FK y CASCADE |
| SPEC-SEC-01 (cifrado en reposo AES-256) | Completo | SELECT directo ≠ dato en claro; verificado con test de integración |
| RNF-04 (cifrado PII) | Parcial | Campos `nombre` y `numDocumento` protegidos; otros campos PII (si los hay) en sesiones posteriores |

---

## 4. Decisiones técnicas y justificación

### VOL-S2-01 — Tipo Text en lugar de VARCHAR(200) para campos cifrados
**Spec original (SPEC-DATA-02):** `nombre VARCHAR(200)`, `num_documento VARCHAR(40)`.  
**Cambio aplicado:** ambos campos son `TEXT` (sin límite).  
**Justificación:** el ciphertext AES-256-GCM = IV(12 B) + authTag(16 B) + datos + codificación base64.  
Un nombre de 200 chars cifrado ocupa ≈ 308 chars en base64, desbordando `VARCHAR(200)`.  
`num_documento` (≤40 chars) quedaría en ≈ 92 chars en base64, desbordando `VARCHAR(40)`.  
**Impacto en spec:** SPEC-DATA-02 registrada como volatilidad; actualizar DDL de referencia en DEV_SPEC.

### VOL-S2-02 — Índice `idx_cliente_nombre` sobre campo cifrado (decisión diferida)
**Spec original (SPEC-DATA-02):** `CREATE INDEX idx_cliente_nombre ON cliente (nombre)` para SPEC-API-09.  
**Problema:** con IV aleatorio (AES-GCM no-determinístico), el ciphertext de "Ana López" varía en cada cifrado.
Un B-Tree index sobre el campo cifrado no puede usarse para búsquedas `LIKE` ni igualdad por nombre real.  
**Acción en Sesión 2:** el índice se crea exactamente como pide la spec (estructura de BD fiel al contrato).  
**Decisión diferida a Sesión 7 (SPEC-API-09):** elegir entre:  
  a) Descifrado en aplicación + filtrado en memoria (simple, escala hasta ~10.000 registros).  
  b) Blind index (HMAC del plaintext como columna extra) — buscable, no reversible.  
  c) Cifrado determinístico (AES-SIV) — buscable pero rompe la propiedad de IVs únicos.  
**Impacto:** el índice actual no sirve para búsqueda de nombre; aplazar la decisión a Sesión 7 cuando
se implementa SPEC-API-09.

### VOL-S2-03 — folio nullable (conflicto SPEC-DATA-01 vs SPEC-API-02)
**Spec SPEC-DATA-01:** `folio VARCHAR(20) NOT NULL UNIQUE`.  
**Spec SPEC-API-02:** `201: { id, folio: null, estado: 'BORRADOR' }` — folio se asigna al guardar.  
**Conflicto:** NOT NULL impide el estado BORRADOR sin folio.  
**Resolución:** `folio VARCHAR(20) UNIQUE` (nullable). PostgreSQL UNIQUE permite múltiples NULLs
(NULL ≠ NULL en SQL), por lo que un `UNIQUE` estándar modela correctamente:
múltiples borradores sin folio + unicidad una vez asignado.  
**Nota:** en Sesión 5, `FolioService.generar()` asignará el folio desde `seq_folio_dds` y cambiará
`estado` a GUARDADO. Se revisará si se añade una CHECK constraint (`estado='GUARDADO' → folio NOT NULL`).

### Otras decisiones técnicas
| Decisión | Alternativa descartada | Justificación |
|----------|------------------------|---------------|
| `prisma migrate diff --from-empty --to-schema-datamodel` para generar SQL | `migrate dev --create-only` (requiere BD) | Permite generar el DDL sin BD activa; se editó para añadir `CREATE SEQUENCE` |
| `process.loadEnvFile()` en tests/setup.ts | `dotenv` como dependencia | Node 22 lo incluye nativamente; sin deps extra |
| Puerto `5433:5432` en docker-compose (DEF-S2-01) | Puerto 5432 | PostgreSQL 17 nativo en la máquina de desarrollo también escucha en 5432; puerto 5433 evita el conflicto sin afectar CI |
| CryptoService con IV aleatorio por operación | IV derivado de clave + datos | Seguridad semántica IND-CPA: dos cifrados del mismo valor producen ciphertexts distintos |
| Repositorio wrapper (ClienteRepository) | Prisma middleware | El middleware de Prisma 5 tiene tipado complejo; el wrapper es más explícito y testeable |

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Cifrado en reposo AES-256-GCM — campos PII | ✅ | SPEC-SEC-01, RNF-04, Art. 55 | Test `cifrado.test.ts`: SELECT directo ≠ plaintext |
| Clave de cifrado desde variable de entorno | ✅ | SPEC-SEC-06 | `ENCRYPTION_KEY` en `.env` (ignorado por git) |
| authTag GCM valida integridad | ✅ | SPEC-SEC-01 | Test: adulteración del tag lanza error |
| Sin secretos hardcodeados (heredado Sesión 1) | ✅ | SPEC-SEC-06 | `.env` en `.gitignore` |
| `idx_cliente_nombre` diferido (no expone datos) | ✅ | VOL-S2-02 | Índice sobre ciphertext, no plaintext |

---

## 6. Métricas registradas en este punto

> **Nota sobre SonarCloud:** las métricas de complejidad ciclomática, code smells,
> vulnerabilidades y debt ratio se obtienen al completar el primer pipeline en CI.
> Se marcan como "Pendiente CI" hasta que el push a `main` dispare el análisis.

| Métrica | Valor | Herramienta | Variación vs Sesión 1 |
|---------|-------|-------------|----------------------|
| KLOC (solo `src/`) | **0.10** (102 líneas) | `wc -l src/**/*.ts` | +0.09 KLOC (S1: ~0.01) |
| KLOC (total TS: `src/` + `tests/`) | **0.57** (571 líneas) | `wc -l` | +0.52 KLOC |
| Cobertura — statements | **100%** (41/41) | Vitest lcov v8 | 87.8% → 97.56% → **100%** (ver §7.1) |
| Cobertura — ramas | **100%** (6/6) | Vitest lcov v8 | 66.66% → 83.33% → **100%** |
| Cobertura — funciones | **100%** (10/10) | Vitest lcov v8 | 80% → 100% → **100%** |
| Cobertura — líneas | **100%** (38/38) | Vitest lcov v8 | 92.1% → 97.36% → **100%** |
| Complejidad ciclomática (máx/prom) | Pendiente CI | SonarCloud | — |
| Code smells | Pendiente CI | SonarCloud | — |
| Vulnerabilidades (crít/altas) | Pendiente CI | SonarCloud | — |
| Debt ratio (%) | Pendiente CI | SonarCloud | — |
| Defectos detectados | 1 (DEF-S2-01) | Manual | +1 |
| Tests totales | **25** (7 unit + 18 integration) | Vitest | +24 (S1: 1) |
| Horas-persona | (completar al cerrar la sesión) | Bitácora del equipo | — |

### Acoplamiento entre entidades (medición manual)
Relaciones FK en el esquema (arcos del grafo de dependencias):

| Entidad origen | Referencias | FK count |
|----------------|-------------|----------|
| `FormularioDDS` | `Oficial` | 1 |
| `Cliente` | `FormularioDDS` | 1 |
| `DatosContacto` | `FormularioDDS` | 1 |
| `PerfilEconomico` | `FormularioDDS` | 1 |
| `Documento` | `FormularioDDS` | 1 |
| `LogAuditoria` | `Oficial` (nullable) | 1 |

**Total de arcos:** 6 / 7 entidades = **0.86 arcos/entidad** (acoplamiento moderado, esperado para un modelo relacional).
`FormularioDDS` es el hub central: 4 entidades dependen de ella.

---

## 7. Defectos encontrados / resueltos

| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|
| DEF-S2-01 | PostgreSQL 17 nativo (Windows, PID 7088) ocupa el puerto 5432, impidiendo que el contenedor Docker sea accesible desde el host para `prisma migrate deploy` y tests locales | Media | ✅ Resuelto | Cambiar mapeo de puerto en `docker-compose.yml` a `5433:5432` y actualizar `DATABASE_URL` local a `localhost:5433`. El CI (GitHub Actions) no tiene este conflicto y sigue usando 5432. |

---

### 7.1 Ciclo de medición — mejora de cobertura

Aplicación del proceso Objetivo → Métrica → Recolección → Análisis → Acción al cierre de la sesión.

**Objetivo:** Definition of Done (DEV_SPEC §7) exige cobertura ≥ 80% en la lógica de negocio asociada a cada spec implementada. `CryptoService` y `ClienteRepository` son la lógica de negocio de SPEC-SEC-01.

**Métrica:** porcentaje de statements, ramas, funciones y líneas por archivo — reportado por Vitest con provider v8.

**Recolección:** `npm run test:coverage` → tabla por archivo en terminal + `coverage/lcov.info` para SonarCloud.

**Análisis — iteración 1 (cobertura inicial: 87.8% total):**

| Archivo | Stmts | Branch | Funcs | Lines | Problema |
|---------|-------|--------|-------|-------|---------|
| `cliente.repository.ts` | 55.55% | 50% | 60% | 71.42% | `findByFormularioId` nunca llamada (0 calls); rama `!row → null` en `findById` no ejercitada |
| `crypto.service.ts` | 95.83% | 75% | 100% | 95.65% | Guard `key.length !== 32` (línea 16) no ejercitado |

Ambos archivos por debajo del umbral del 80% o con ramas críticas sin cubrir.

**Acción 1 — `cliente.repository.ts`:**  
Crear `tests/integration/cliente-repo.test.ts` con tres tests dirigidos:  
- `findById('UUID-inexistente')` → cubre la rama `!row → return null`  
- `findByFormularioId(id)` con 2 clientes → cubre el body completo incluido el map callback  
- `findByFormularioId(id-sin-clientes)` → confirma retorno de array vacío sin error  

Resultado: `cliente.repository.ts` → **100%** en todas las métricas. Total: 97.56% stmts / 83.33% ramas.

**Análisis — iteración 2 (cobertura intermedia: 97.56%):**

| Archivo | Stmts | Branch | Funcs | Lines | Problema |
|---------|-------|--------|-------|-------|---------|
| `crypto.service.ts` | 95.83% | 75% | 100% | 95.65% | `key.length !== 32` (línea 16): rama `true` no ejercitada |

**Acción 2 — `crypto.service.ts`:**  
Añadir un test en `tests/unit/cifrado.test.ts` que pase `Buffer.alloc(16).toString('base64')` (AES-128, longitud incorrecta) y verifique que `encrypt()` lanza `'ENCRYPTION_KEY debe decodificar exactamente 32 bytes'`.

Resultado: `crypto.service.ts` → **100%**. Total: **100% stmts / 100% ramas / 100% funcs / 100% lines**.

**Evaluación del ciclo:** el proceso detectó una cobertura insuficiente en la capa de cifrado (55% en el repositorio y rama de guard sin ejercitar), generó tests precisamente dirigidos a las ramas faltantes, y elevó la cobertura a 100% en 2 iteraciones. La herramienta (Vitest lcov + v8) permitió identificar los archivos y líneas exactas sin revisión manual del código.

---

## 8. Pruebas añadidas

| Archivo | Tipo | Qué cubre | Tests |
|---------|------|-----------|-------|
| `tests/unit/cifrado.test.ts` | Unitario | AES-256-GCM: round-trip, IV aleatorio, integridad de authTag, error sin clave, guard longitud incorrecta (SPEC-SEC-01) | 6 |
| `tests/integration/modelo.test.ts` | Integración | CRUD de los 7 modelos Prisma; UNIQUE de folio; CASCADE ON DELETE; existencia y monotonía de `seq_folio_dds` (SPEC-DATA-01..03) | 12 |
| `tests/integration/cifrado.test.ts` | Integración | SELECT crudo ≠ plaintext para `nombre` y `num_documento`; descifrado transparente en `ClienteRepository` (SPEC-SEC-01) | 3 |
| `tests/integration/cliente-repo.test.ts` | Integración | Ramas de `ClienteRepository`: `findById` → null, `findByFormularioId` con resultados, `findByFormularioId` vacío (ciclo §7.1) | 3 |

---

## 9. Commits de la sesión

_(se completa después del commit de cierre)_

| Hash | Mensaje | Archivos principales |
|------|---------|---------------------|
| `4a71545` | `feat(data): modelos Prisma, migración SQL y seq_folio_dds (SPEC-DATA-01..03)` | `prisma/schema.prisma`, `prisma/migrations/20260608000000_.../migration.sql` |
| `ad281cd` | `security(cifrado): AES-256-GCM en reposo para campos PII (SPEC-SEC-01)` | `src/security/crypto.service.ts`, `src/infrastructure/repositories/cliente.repository.ts` |
| `634a703` | `test(s02): persistencia de entidades y cifrado en BD (SPEC-DATA-01..03, SPEC-SEC-01)` | `tests/integration/`, `tests/unit/cifrado.test.ts`, `tests/setup.ts`, `vitest.config.ts` |
| `a426599` | `chore(ci): migrate deploy, ENCRYPTION_KEY y quitar \|\|true (Sesión 2)` | `.github/workflows/ci.yml`, `.env.example` |
| `45d0eec` | `fix(dev): puerto 5433 para postgres local (DEF-S2-01)` | `docker-compose.yml` |
| `3c2e354` | `docs(sesion-02): cierre con métricas reales, VOL y DEF (Sesión 2)` | `docs/sesiones/sesion-02.md` |
| `038cead` | `docs(sesion-02): añadir hashes reales de commits al cierre` | `docs/sesiones/sesion-02.md` |
| `d0d8d1d` | `test(s02): subir cobertura de cliente.repository sobre 80%` | `tests/integration/cliente-repo.test.ts` |
| `80c0d6b` | `test(s02): cubrir guard de longitud de clave en CryptoService` | `tests/unit/cifrado.test.ts` |

---

## 10. Pendientes y riesgos para la próxima sesión

### Para la Sesión 3 (RF-01, RF-02)
- Implementar endpoints `PUT /api/formularios/:id/identificacion` y `PUT .../contacto`.
- Validación de cédula panameña con regex (SPEC-RN-02, DEF001).
- Validación de campos obligatorios (RF-08, CA-02).
- Tests unitarios de las reglas de negocio y tests de integración de los endpoints.
- Añadir umbrales de cobertura en `vitest.config.ts` (80% líneas/funciones).

### Métricas pendientes de confirmar
- Completar columna "Pendiente CI" de §6 una vez que el pipeline de CI corra con estos commits.
- Métricas esperadas: complejidad ciclomática máx ≤ 3 (módulos simples), debt ratio ~0%.

### Riesgos identificados
| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| `process.loadEnvFile` no disponible en Node <20.12 | Baja (proyecto usa Node 22) | Ya mitigado; añadir nota en `README` si se baja de versión |
| Búsqueda por nombre (Sesión 7) con campo cifrado | Alta | Decisión diferida a Sesión 7 (VOL-S2-02); documentada |
| Drift de schema si se edita el Prisma model sin crear nueva migración | Media | Usar `prisma migrate dev` para generar nueva migración; no editar SQL manualmente sin actualizar schema |
| Conflicto de puerto 5432 en otras máquinas del equipo | Media | La clave `DATABASE_URL` en `.env` es local; el `.env.example` ya muestra 5433 |

---

## 11. Evidencia / capturas

### Verificación local

```
# tablas creadas:
\dt
              List of relations
 Schema |        Name        | Type  | Owner 
--------+--------------------+-------+-------
 public | _prisma_migrations | table | dds
 public | cliente            | table | dds
 public | datos_contacto     | table | dds
 public | documento          | table | dds
 public | formulario_dds     | table | dds
 public | log_auditoria      | table | dds
 public | oficial            | table | dds
 public | perfil_economico   | table | dds

# secuencia:
SELECT sequence_name FROM information_schema.sequences;
 sequence_name 
---------------
 seq_folio_dds

# tests finales (tras ciclo de mejora de cobertura §7.1):
 Test Files  5 passed (5)
      Tests  25 passed (25)
   Duration  1.19s

# cobertura final (Vitest v8) — progresión por iteración:
#
# Iteración 1 (tras implementación inicial, 21 tests):
#   cliente.repository.ts  55.55%  50%  60%  71.42%
#   crypto.service.ts      95.83%  75%  100% 95.65%
#   All files              87.8%   66.66% 80%  92.1%
#
# Iteración 2 (tras cliente-repo.test.ts, 24 tests):
#   cliente.repository.ts  100%    100% 100% 100%
#   crypto.service.ts      95.83%  75%  100% 95.65%
#   All files              97.56%  83.33% 100% 97.36%
#
# Iteración 3 (tras guard test en cifrado.test.ts, 25 tests):
 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
 cliente.repo.ts   |  100.00 |   100.00 |  100.00 |  100.00 |
 crypto.service.ts |  100.00 |   100.00 |  100.00 |  100.00 |
All files          |  100.00 |   100.00 |  100.00 |  100.00 |
```

> SonarCloud (complejidad, code smells, vulnerabilidades, debt ratio): pendiente del
> primer push con estos commits y ejecución del pipeline de CI.
