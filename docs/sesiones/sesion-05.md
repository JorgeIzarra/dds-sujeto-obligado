# Sesión 05 — Folio único y checklist documental (RF-05, RF-07)

**Fecha:** 2026-07-11
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** (completar al cerrar la sesión)

---

## 1. Objetivo de la sesión

Implementar `FolioService.generar()` (SPEC-RN-03, RN-03, RF-07) sobre la
`SEQUENCE` de PostgreSQL con su ciclo completo de medición de concurrencia
(DEF003, SPEC-BHV-05), el checklist de documentos
`POST /api/formularios/:id/documentos` (RF-05, SPEC-API-06), y el endpoint
de guardado `POST /api/formularios/:id/guardar` (RF-07/RF-08/RN-03/RN-04,
SPEC-API-07) — implementando de esa spec únicamente los pasos 1, 2, 4 y 5
(campos completos, documento de identidad verificado, folio, estado→GUARDADO).
El paso 3 (chequeo PEP, 409) queda diferido a la Sesión 6, que trae
`SPEC-RN-05`/`puedeGuardarseComoDDS()`.

**Criterio de cierre:** 0 folios duplicados bajo carga concurrente; checklist
de documentos funcional; el guardado bloquea correctamente formularios
incompletos o sin documento de identidad verificado.

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Función pura `formatearFolio()` | `src/domain/folio.ts` | SPEC-RN-03; `DDS-AAAA-NNNNNN` con padding a 6 dígitos; V(G)=1 |
| `FolioService.generar()` | `src/infrastructure/services/folio.service.ts` | `SELECT nextval('seq_folio_dds')` + `formatearFolio()`; primer archivo bajo el nuevo directorio `src/infrastructure/services/` |
| `DocumentoRepository` | `src/infrastructure/repositories/documento.repository.ts` | `create()` y `existeIdentidadVerificada()` (RN-04) |
| Controller de documentos | `src/interfaces/controllers/documento.controller.ts` | `POST /:id/documentos`; Zod con `verificado` opcional (VOL-S5-01); auditoría CREAR |
| Controller de guardado | `src/interfaces/controllers/guardar.controller.ts` | `POST /:id/guardar`; pasos 1/2/4/5 de SPEC-API-07; auditoría GUARDAR con el folio |
| Router de formularios ampliado | `src/interfaces/routes/formularios.routes.ts` | Añadidos `POST /:id/documentos` y `POST /:id/guardar` |
| Tests unitarios | `tests/unit/folio.test.ts` | 4 tests: formato y padding de `formatearFolio` |
| Tests de integración — concurrencia | `tests/integration/folio-concurrencia.test.ts` | 2 tests: folio individual + 50 llamadas paralelas sin duplicados (SPEC-BHV-05, DEF003) |
| Tests de integración — documentos | `tests/integration/documentos.test.ts` | 6 tests del endpoint de documentos |
| Tests de integración — guardar | `tests/integration/guardar.test.ts` | 8 tests del endpoint de guardado (incluye SPEC-BHV-06 y el caso de tipo de documento no coincidente, añadido tras revisión de calidad) |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-05 — Checklist de documentos | Completo | Endpoint `POST /documentos` con timestamp automático (CA-09) |
| RF-07 — Generación de folio único | Completo | `FolioService.generar()` sobre `seq_folio_dds`; formato verificado |
| RF-08 — Validación de campos obligatorios (en `guardar`) | Completo | Bloquea si falta `cliente`, `datosContacto` o `perfilEconomico` |
| RN-03 — Folio único, irrepetible bajo concurrencia | Completo | 50 llamadas paralelas, 0 duplicados (CA-03) |
| RN-04 — Documento mínimo (identidad verificada) | Completo | Bloquea si no existe un documento del mismo tipo que `cliente.tipoDocumento`, verificado |
| SPEC-RN-03 — Formato de folio | Completo | `formatearFolio()`, 4 tests incl. patrón regex |
| SPEC-BHV-05 — Concurrencia de folios (DEF003) | Completo | Ciclo de medición completo (ver §6) |
| SPEC-API-06 — Contrato POST /documentos | Completo (extendido, VOL-S5-01) | `verificado` opcional añadido al contrato |
| SPEC-API-07 — Guardar formulario | **Parcial** (pasos 1/2/4/5 de 5) | Paso 3 (PEP, 409) diferido a Sesión 6 — decisión confirmada con el usuario |
| SPEC-BHV-06 — Documento no verificado bloquea guardado | Completo | 3 tests: sin documento, documento no verificado, documento de tipo distinto |
| CA-03, CA-08, CA-09 | Completo | Ver tests de §8 |
| SPEC-SEC-02, SPEC-SEC-04 | Completo | Zod en el borde; auditoría CREAR/GUARDAR en ambos endpoints |

---

## 4. Decisiones técnicas y justificación

### VOL-S5-01 — `verificado` explícito en `POST /documentos` (nueva volatilidad de spec)
**Spec original (SPEC-API-06):** body `{ tipo, baseLegal? }`, sin `verificado`.
**Cambio aplicado:** se añade `verificado` como campo **opcional** (default `false`).
**Justificación:** RN-04 ("documento de identidad **marcado como presentado**") y
CA-08 ("bloqueo si no está **verificado**") apuntan a un estado de verificación
explícito, no a la mera existencia de la fila — y el campo `verificado` del DDL
(diseñado en la Sesión 2) fue creado exactamente para esto. Tratar la sola
presencia como suficiente habría dejado ese campo permanentemente sin uso
funcional en un sistema cuyo principio rector (PRD §1) es el cumplimiento AML.
Decisión confirmada explícitamente con el usuario antes de implementar (mismo
patrón que VOL-S3-01).
**Impacto:** `RN-04` en `guardar.controller.ts` exige coincidencia exacta de
`tipo` con `cliente.tipoDocumento` **y** `verificado = true`; verificado con un
test dedicado (documento verificado pero de tipo distinto → sigue bloqueado).

### Alcance parcial de SPEC-API-07 (decisión confirmada con el usuario)
Se implementan solo los pasos 1, 2, 4 y 5 de los 5 que especifica SPEC-API-07.
El paso 3 (verificación PEP, 409 `PEP_NO_ELEGIBLE`) requiere `SPEC-RN-05`
(`puedeGuardarseComoDDS()`), asignada explícitamente a la Sesión 6 en
`DEV_SPEC.md §9`. El código deja solo un comentario marcando el punto de
inserción futuro, sin lógica parcial ni stub que pueda confundirse con una
implementación real.

### `POST /api/formularios` (SPEC-API-02) no implementado esta sesión
Decisión confirmada con el usuario: se mantiene el patrón de Sesiones 3/4
(crear el `FormularioDDS` directo vía Prisma en el setup de los tests).
`DEV_SPEC.md` no asigna esta spec a ninguna sesión explícitamente; encaja
mejor en la Sesión 6, cuando el `oficialId` vendrá del JWT de autenticación
en vez de tener que inventarse en el body.

### Guard `if (secciones.length > 0 || !cliente)` en `guardar.controller.ts`
El disyunto `|| !cliente` no añade ningún caso nuevo (si `cliente` es `null`,
`secciones` ya contiene `'cliente'` y por tanto `secciones.length > 0` es
verdadero) — su único propósito es permitir que TypeScript (`strict: true`)
narrowe `cliente` a no-nulo después del `return`, evitando un non-null
assertion (`cliente!`) al usar `cliente.tipoDocumento` más abajo. Verificado
con el caso borde simétrico (falta solo `datosContacto`, con `cliente`
presente): el mensaje de error sigue siendo correcto.

### Otras decisiones técnicas
| Decisión | Alternativa descartada | Justificación |
|----------|------------------------|---------------|
| `src/infrastructure/services/` como directorio nuevo | Meter `FolioService` en `repositories/` | Repositorios mapean 1:1 con modelos Prisma vía CRUD; la generación de folio no corresponde a una entidad y usa `$queryRaw` sobre una secuencia, no un modelo — merece su propio directorio |
| `$queryRaw` con template literal 100% estático para `nextval()` | Interpolar el nombre de la secuencia | Sin valores dinámicos del usuario en el string SQL; cumple SPEC-SEC-03 trivialmente (nada que parametrizar) |
| `Number(rows[0].nextval)` para convertir el `bigint` de Postgres | Mantener `bigint` end-to-end | Muy por debajo de `Number.MAX_SAFE_INTEGER` para el volumen de este sistema académico; conversión explícita, no silenciosa |
| Test de concurrencia contra `FolioService.generar()` directo | Contra el endpoint `POST /guardar` completo | DEV_SPEC.md redacta SPEC-BHV-05 en términos de "guardado", pero probar 50 guardados completos habría requerido 50 formularios válidos de punta a punta; probar el servicio de folio directamente aísla y confirma el mecanismo exacto que resuelve DEF003 (atomicidad de `nextval()`), que es el núcleo del defecto histórico |
| `afterAll` de `guardar.test.ts` borra `formularioDDS` antes que `oficial` | Solo borrar `oficial` (como en tests de sesiones previas) | `FormularioDDS.oficialId` no tiene `onDelete: Cascade`; este archivo crea múltiples formularios (uno por test) referenciando el mismo oficial, a diferencia de otros tests de integración que crean uno solo en `beforeAll` |

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Validación y saneamiento de entradas (SPEC-SEC-02) | ✅ | RF-08 | Zod en `documento.controller.ts`; 422 con `CAMPOS_INVALIDOS` |
| Auditoría obligatoria (SPEC-SEC-04) | ✅ | RNF-05 | `accion: 'CREAR'` (documentos) y `accion: 'GUARDAR'` (guardado, con folio en `detalle`) |
| Consultas parametrizadas (SPEC-SEC-03) | ✅ (heredado, Prisma ORM + `$queryRaw` estático) | OWASP A03 | `nextval('seq_folio_dds')` es un literal fijo sin interpolación de datos de usuario |
| Validación estricta de reglas de negocio (RN-04) | ✅ | CA-08, SPEC-BHV-06 | `existeIdentidadVerificada()` exige coincidencia exacta de tipo + verificado=true; probado incl. caso de tipo distinto |
| Resolución estructural de DEF003 (folio duplicado) | ✅ | RN-03, CA-03 | `SEQUENCE` de PostgreSQL (Sesión 2) + `FolioService` (esta sesión); verificado empíricamente con 50 llamadas paralelas |

---

## 6. Métricas registradas en este punto

| Métrica | Valor | Herramienta | Variación vs Sesión 4 |
|---------|-------|-------------|----------------------|
| KLOC `src/` | **0.686** (686 líneas) | `wc -l src/**/*.ts` | +0.205 (S4: 0.481) |
| KLOC total (`src/` + `tests/`) | **2.033** (2033 líneas) | `wc -l` | +0.561 (S4: 1.472) |
| Cobertura — statements | **98.94%** (188/190) | Vitest v8 | +0.42 pp (S4: 98.52%) |
| Cobertura — branches | **94.11%** (64/68) | Vitest v8 | +2.81 pp (S4: 91.3%) |
| Cobertura — functions | **100%** (33/33) | Vitest v8 | Mantenida |
| Cobertura — lines | **98.88%** (178/180) | Vitest v8 | +0.44 pp (S4: 98.44%) |
| Complejidad ciclomática — `postGuardar()` | **V(G) = 8** (6 `if` + 1 `\|\|` + 1) | Conteo manual, estilo SonarCloud (cuenta `\|\|`/`&&` como decisión adicional) | Meta PRD ≤10 — **cumplida** |
| Complejidad ciclomática — `formatearFolio()` | **V(G) = 1** (sin ramas) | Conteo manual | Dentro de meta |
| Complejidad ciclomática — `FolioService.generar()` | **V(G) = 1** (secuencia lineal, sin ramas) | Conteo manual | Dentro de meta |
| Complejidad ciclomática (SonarCloud, global) | Pendiente CI | SonarCloud | — |
| Code smells / Vulnerabilidades / Debt ratio | Pendiente CI | SonarCloud | — |
| Tests totales | **108** (46 unit + 62 integration) | Vitest | +20 (S4: 88) |
| Defectos detectados | 0 nuevos; 1 gap de cobertura cerrado en revisión (ver §7) | Manual + revisión de calidad | — |
| Horas-persona | (completar al cerrar la sesión) | Bitácora del equipo | — |

### Detalle — Complejidad ciclomática de `postGuardar()` (método más ramificado de la sesión)

```typescript
export async function postGuardar(req: Request, res: Response): Promise<void> {
  if (!formulario) { ... }                              // decisión 1
  // ...
  if (!cliente) secciones.push('cliente');              // decisión 2
  if (!datosContacto) secciones.push('datosContacto');  // decisión 3
  if (!perfilEconomico) secciones.push('perfilEconomico'); // decisión 4
  if (secciones.length > 0 || !cliente) { ... }         // decisión 5 (if) + decisión 6 (||)
  // ...
  if (!identidadVerificada) { ... }                     // decisión 7
  // ... camino final: folio + guardado + auditoría      // camino base
}
```

V(G) = 7 + 1 = **8**, contando el operador `||` como una decisión adicional
(convención de SonarCloud). Contando solo sentencias `if` (sin desglosar el
`||`), el conteo sería 6+1=7. Cualquiera de las dos lecturas queda muy por
debajo de la meta del PRD §11 (V(G) ≤ 10). El disyunto `|| !cliente` es
lógicamente redundante con la comprobación de `secciones` (ver §4) — existe
únicamente para el *narrowing* de tipos de TypeScript, no añade una rama de
negocio real.

`formatearFolio()` y `FolioService.generar()` tienen V(G)=1 cada una (sin
condicionales): toda la complejidad de decisión de esta sesión se concentra,
deliberadamente, en la orquestación del endpoint de guardado — consistente
con el principio de diseño del PRD §10 de mantener `/domain` e `/infrastructure`
con complejidad mínima.

### Detalle de cobertura por archivo nuevo (Sesión 5)

| Archivo | % Stmts | % Branch | % Funcs | % Lines | Líneas sin cubrir |
|---------|---------|---------|---------|---------|-------------------|
| `src/domain/folio.ts` | 100% | 100% | 100% | 100% | — |
| `src/infrastructure/services/folio.service.ts` | 100% | 100% | 100% | 100% | — |
| `src/infrastructure/repositories/documento.repository.ts` | 100% | 100% | 100% | 100% | — |
| `src/interfaces/controllers/documento.controller.ts` | 100% | 100% | 100% | 100% | — |
| `src/interfaces/controllers/guardar.controller.ts` | 100% | 100% | 100% | 100% | — |

> `identificacion.controller.ts` (90.47%, líneas 51-58) y
> `auditoria.repository.ts` (50% branch, línea 21) son deuda heredada de
> sesiones anteriores, sin cambios en esta sesión.

---

## 7. Defectos encontrados / resueltos

| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|
| — | Revisión de calidad de código de la Tarea 4 señaló que ningún test ejercitaba el caso de un documento **verificado pero de tipo distinto** al `tipoDocumento` del cliente (ej. cliente con cédula, solo pasaporte verificado en archivo) | Media (gap de cobertura sobre una regla de cumplimiento AML, RN-04) | ✅ Resuelto en la misma sesión | Añadido test `422 — documento verificado pero de tipo distinto al del cliente` en `tests/integration/guardar.test.ts`; confirma que `existeIdentidadVerificada()` exige coincidencia exacta de tipo, no solo `verificado=true` en cualquier documento |

Ningún otro defecto nuevo. DEF003 (folio duplicado bajo concurrencia) queda
resuelto y verificado empíricamente en esta sesión (ver §6 del ciclo de
medición abajo).

### Ciclo de medición — DEF003 (folio duplicado bajo concurrencia)

Aplicación del proceso Objetivo → Métrica → Recolección → Análisis → Mejora,
primer caso completo de este ciclo en el proyecto (PRD §11, §14).

**Objetivo:** 0 folios duplicados bajo concurrencia, incluso con múltiples
solicitudes simultáneas (CA-03, RN-03).

**Métrica:** folios únicos / folios generados, bajo una carga de 50 llamadas
concurrentes a `FolioService.generar()`.

**Recolección:** `tests/integration/folio-concurrencia.test.ts`, ejecutado
con `Promise.all` sobre 50 invocaciones simultáneas de `generar()` contra la
BD real (`localhost:5433`).

**Análisis:** las 50 llamadas produjeron 50 folios distintos (`new
Set(folios).size === 50`), todos con el patrón `DDS-AAAA-NNNNNN` correcto.
El mecanismo que garantiza esto es `nextval('seq_folio_dds')`: PostgreSQL
implementa las secuencias con incrementos atómicos a nivel de motor —
cada llamada concurrente obtiene un valor exclusivo sin necesidad de locks
explícitos en la capa de aplicación, incluso bajo transacciones concurrentes.

**Mejora / conclusión:** el diseño de la Sesión 2 (`CREATE SEQUENCE
seq_folio_dds` + columna `folio UNIQUE`) resuelve DEF003 **estructuralmente**,
no mediante lógica de reintento o verificación de duplicados en la
aplicación. Esta sesión aporta la primera prueba automatizada que lo
demuestra empíricamente, cerrando el ciclo abierto desde la Sesión 2. No se
requiere ninguna acción correctiva adicional — el defecto está resuelto por
diseño y verificado por test.

---

## 8. Pruebas añadidas

| Archivo | Tipo | Qué cubre | Tests |
|---------|------|-----------|-------|
| `tests/unit/folio.test.ts` | Unitario | `formatearFolio`: padding normal, secuencia=1, secuencia de 6 dígitos exactos (sin truncar), patrón regex (SPEC-RN-03) | 4 |
| `tests/integration/folio-concurrencia.test.ts` | Integración | Folio individual con patrón correcto; 50 llamadas paralelas con 0 duplicados (SPEC-BHV-05, DEF003, CA-03) | 2 |
| `tests/integration/documentos.test.ts` | Integración | Creación con timestamp automático (CA-09), `verificado` default false y explícito true (VOL-S5-01), 422 falta tipo, 404 formulario inexistente, auditoría CREAR (SPEC-API-06) | 6 |
| `tests/integration/guardar.test.ts` | Integración | 404 formulario inexistente, 422 sin ninguna sección, 422 falta una sección, 422 sin documento, 422 documento no verificado, 422 documento de tipo distinto, 200 happy path con folio+estado, auditoría GUARDAR con folio en detalle (SPEC-API-07 parcial, SPEC-BHV-06) | 8 |

**Total nuevos: 20 tests | Total acumulado: 108 tests** (88 previos de Sesión 4 + 20 de esta sesión).

---

## 9. Commits de la sesión

| Hash | Mensaje | Archivos principales |
|------|---------|---------------------|
| `a06d3c2` | `test(folio): formato y padding SPEC-RN-03 (RF-07, RN-03)` | `tests/unit/folio.test.ts` |
| `1687d1a` | `feat(domain): formatearFolio pura DDS-AAAA-NNNNNN (SPEC-RN-03, RF-07)` | `src/domain/folio.ts` |
| `c0b932a` | `test(folio): concurrencia 50 llamadas paralelas SPEC-BHV-05 (RF-07, DEF003)` | `tests/integration/folio-concurrencia.test.ts` |
| `2fc4304` | `feat(infra): FolioService.generar sobre seq_folio_dds (SPEC-RN-03, DEF003)` | `src/infrastructure/services/folio.service.ts` |
| `0cda574` | `test(api): tests de integracion SPEC-API-06 documentos (RF-05)` | `tests/integration/documentos.test.ts` |
| `5e9535e` | `feat(api): POST /documentos con verificado opcional y auditoria CREAR (RF-05, SPEC-API-06, VOL-S5-01)` | `documento.repository.ts`, `documento.controller.ts`, `formularios.routes.ts` |
| `3346357` | `test(api): tests de integracion SPEC-API-07 parcial guardar (RF-07, RF-08, RN-04)` | `tests/integration/guardar.test.ts` |
| `994a0fa` | `feat(api): POST /guardar con folio, campos completos y RN-04 (RF-07, RF-08, RN-04, SPEC-API-07 parcial)` | `guardar.controller.ts`, `formularios.routes.ts` |
| `206dda7` | `test(api): cubrir RN-04 con tipo de documento distinto al del cliente (hallazgo de revision de calidad)` | `tests/integration/guardar.test.ts` |

---

## 10. Pendientes y riesgos para la próxima sesión

### Deuda técnica identificada (no bloqueante, heredada o cross-cutting)

| Ítem | Severidad | Notas |
|------|-----------|-------|
| Sin middleware de manejo de errores async en Express | Media | Heredado de sesiones 3-4; se agrava con cada endpoint nuevo (ahora 5 controllers). Candidato para Sesión 6 |
| Sin `prisma.$transaction` en escrituras múltiples (`guardar.controller.ts`: perfil/formulario/auditoría, `documento.controller.ts`: documento/auditoría) | Media | Mismo patrón que sesiones anteriores; evaluar transversalmente en Sesión 6/9 |
| Sin guard contra re-guardar un formulario ya `GUARDADO`/`APROBADO` | Baja | `POST /guardar` llamado dos veces genera un folio nuevo y un evento de auditoría duplicado; no hay chequeo de estado previo. Encaja naturalmente en la máquina de estados que trae RN-06 (Sesión 6, ediciones de formulario aprobado) |
| Secuencia global `seq_folio_dds` sin reset anual | Baja | Al superar 999,999 el folio tendría un sufijo de 7 dígitos, rompiendo el patrón `^DDS-\d{4}-\d{6}$` (aunque la unicidad de RN-03 se mantendría). Diseño heredado de Sesión 2, no introducido esta sesión; volumen del sistema académico lo hace impráctico como riesgo real |

### Para la Sesión 6 (RF-12, RNF-01, RNF-05 — seguridad, roles, PEP, auditoría)
- Implementar el paso 3 de SPEC-API-07: `puedeGuardarseComoDDS()` (SPEC-RN-05) y el 409 `PEP_NO_ELEGIBLE` en `guardar.controller.ts`.
- Autenticación + autorización por rol (Oficial/Supervisor); conectar `usuarioId` en auditoría (hoy `null` en todos los endpoints).
- Evaluar `POST /api/formularios` (SPEC-API-02) una vez que el `oficialId` pueda venir del JWT.
- Cabeceras de seguridad (helmet), manejo seguro de sesiones.

### Riesgos
| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Ausencia de manejo de errores async puede ocultar fallos silenciosos en producción | Media | Resolver junto con la capa de seguridad/roles en Sesión 6 |
| Re-guardado sin restricción de estado puede generar folios/auditoría duplicados en uso real | Baja | Documentar como parte del diseño de la máquina de estados en Sesión 6 |
| Docker Desktop no iniciado al arrancar la sesión (recurrente en S4 y S5) | Media | Mantener en el checklist pre-sesión: `docker compose up postgres -d` antes de correr tests de integración |

---

## 11. Evidencia / capturas

```
# Suite completa — 108 tests, 14 archivos (cierre de Sesión 5):
 Test Files  14 passed (14)
      Tests  108 passed (108)
   Duration  2.19s

# Cobertura final (Vitest v8):
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   98.94 |    94.11 |     100 |   98.88 |
 ...e/repositories |     100 |    92.85 |     100 |     100 |
  ...repository.ts |     100 |       50 |     100 |     100 | 21
 ...es/controllers |   97.91 |    92.85 |     100 |   97.84 |
  ...controller.ts |   90.47 |    85.71 |     100 |   90.47 | 51-58
  ...controller.ts |     100 |    83.33 |     100 |     100 | 47
-------------------|---------|----------|---------|---------|-------------------

Statements   : 98.94% ( 188/190 )
Branches     : 94.11% ( 64/68 )
Functions    : 100%   ( 33/33 )
Lines        : 98.88% ( 178/180 )

# Typecheck y lint:
npx tsc --noEmit   → sin errores
npm run lint       → sin errores ni warnings

# Prueba de concurrencia de folios (SPEC-BHV-05, DEF003):
50 llamadas paralelas a FolioService.generar() → 50 folios únicos, 0 duplicados
```

> SonarCloud (complejidad ciclomática global, code smells, vulnerabilidades,
> debt ratio): pendiente del push a `main` y ejecución del pipeline de CI en
> GitHub Actions.
