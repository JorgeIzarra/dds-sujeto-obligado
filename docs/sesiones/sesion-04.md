# Sesión 04 — Perfil económico y clasificación de riesgo (RF-03, RF-06)

**Fecha:** 2026-07-11
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** (completar al cerrar la sesión)

---

## 1. Objetivo de la sesión

Implementar el módulo de mayor lógica de negocio del sistema: la función pura
`clasificarRiesgo()` (SPEC-RN-01, Art. 26) con su tabla de verdad completa
(incluidos los 4 casos límite exactos), el endpoint
`PUT /api/formularios/:id/perfil-economico` (RF-03, SPEC-API-05) que la
invoca y persiste el resultado, el registro de la clasificación en
`log_auditoria` con `accion: 'CLASIFICAR'` (RNF-05, CA-07), y corregir
DEF-S3-01 (deuda técnica diferida de la Sesión 3). Alcance API-only: el badge
reactivo (DEF002) queda diferido a la Sesión 8 (frontend), según la
reestructuración del plan a 9 sesiones acordada al inicio de esta sesión.

**Criterio de cierre:** clasifica correctamente todos los casos límite;
endpoint devuelve `clasificacionRiesgo` correcta (CA-05 — la reactividad del
badge se implementa en la Sesión 8).

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Reestructuración de docs a 9 sesiones | `PRD.md`, `DEV_SPEC.md`, `PLAN_SESIONES.md` | Sesión 8 pasa a ser frontend dedicado; Sesión 9 es el cierre de hardening. Cambios que ya estaban en el working tree, commiteados al inicio de esta sesión |
| Fix DEF-S3-01 | `tests/integration/modelo.test.ts` | Quitado el import de `Decimal` de `@prisma/client` (no es export válido en Prisma 5); reemplazados `new Decimal('X.XX')` por literales numéricos `X.XX` |
| Función pura `clasificarRiesgo()` | `src/domain/clasificacion.ts` | SPEC-RN-01; 3 guard clauses (esPEP, ingresoMensual, volumenMensual); V(G) = 4; sin dependencias de BD ni red |
| `PerfilEconomicoRepository` | `src/infrastructure/repositories/perfil-economico.repository.ts` | `upsertByFormularioId()`; mismo patrón `findFirst` + `update`/`create` que `ContactoRepository` |
| Controller de perfil económico | `src/interfaces/controllers/perfil-economico.controller.ts` | Validación Zod en el borde (SPEC-SEC-02), lee `esPep` de `Cliente` (default `false`), persiste perfil, clasifica, persiste `clasificacionRiesgo` en `FormularioDDS`, audita `accion=CLASIFICAR` |
| Router de formularios ampliado | `src/interfaces/routes/formularios.routes.ts` | Añadido `PUT /:id/perfil-economico` |
| Tests unitarios | `tests/unit/clasificacion.test.ts` | 10 tests: tabla de verdad completa + 4 casos límite exactos |
| Tests de integración | `tests/integration/perfil-economico.test.ts` | 13 tests del endpoint: happy path, idempotencia, límites, 422, 404, auditoría, persistencia, PEP |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-03 — Registro del perfil económico | Completo | Endpoint `PUT /perfil-economico` persiste actividad, fuenteIngresos, ingresoMensual, volumenTransacciones |
| RF-06 — Clasificación automática de riesgo | Completo (API-only) | `clasificarRiesgo()` aplica RN-01; badge reactivo diferido a Sesión 8 |
| SPEC-RN-01 — Tabla de verdad de clasificación | Completo | 10 tests unitarios; los 4 casos límite exactos (5000, 5000.01, 10000, 10000.01) verificados |
| SPEC-API-05 — Contrato PUT /perfil-economico | Completo | Body y respuesta según contrato; clasificación aplicada y expuesta |
| SPEC-SEC-02 — Validación Zod en el borde | Completo | 422 con `CAMPOS_INVALIDOS` y detalle de campos ante body inválido |
| SPEC-SEC-04 — Auditoría obligatoria | Completo | `accion: 'CLASIFICAR'`, `entidad: 'perfil_economico'`, `detalle.clasificacionRiesgo` |
| CA-07 — Registrar clasificación en auditoría | Completo | Verificado con test de integración que consulta `log_auditoria` directamente |
| DEF-S3-01 — Import `Decimal` inválido | Resuelto | Literales numéricos; `tsc --noEmit` limpio |

---

## 4. Decisiones técnicas y justificación

| Decisión | Alternativa descartada | Justificación |
|----------|------------------------|---------------|
| `clasificarRiesgo()` como función pura en `/src/domain` | Método `esClienteBajoRiesgo()` en la clase `PerfilEconomico` (PRD §8) | DEV_SPEC (SDD, fuente de verdad) especifica una función pura verificable sin dependencias de BD/red; mantiene `FormularioDDS`/`PerfilEconomico` sin lógica de negocio incrustada, evitando el riesgo de "God class" señalado en el PRD §14 |
| Guard clauses en orden `esPEP → ingreso → volumen` | Un único `if` compuesto (`&&`/`||`) | Guard clauses mantienen V(G) bajo (4) y cada rama es individualmente testeable y legible; un condicional compuesto oscurecería la dominancia de PEP sobre los demás factores |
| `esPEP` leído con `prisma.cliente.findFirst` directo en el controller (no vía `ClienteRepository`) | Reutilizar `ClienteRepository.findByFormularioId` | `esPep` no requiere descifrado (solo `nombre`/`numDocumento` están cifrados, SPEC-SEC-01); una consulta directa evita el costo de descifrado innecesario. Documentado como nota menor en revisión de código |
| Sin `prisma.$transaction` envolviendo las 3 escrituras (perfil, formularioDDS, auditoría) | Transacción atómica | Consistente con el patrón ya establecido en Sesión 3 (`identificacion`/`contacto` tampoco usan transacciones); se registra como deuda técnica compartida (ver §10), no bloqueante para esta sesión |
| `z.number({ message: '...' })` en vez de `z.number({ invalid_type_error: '...' })` | Replicar literalmente el snippet del plan original | Zod 4.4.3 (instalado en el proyecto) removió `invalid_type_error` de la API clásica; `message` es el reemplazo correcto en Zod 4. Detectado por `tsc --noEmit` durante la implementación, no por inspección manual |
| DEF-S3-01: literales numéricos en vez de `new Decimal(...)` | Mantener el import y castear de otra forma | Prisma 5 no exporta `Decimal` como miembro nombrado de `@prisma/client`; los métodos `create`/`update` aceptan `number` directamente para campos `Decimal`, sin necesidad de instanciar el tipo |

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Validación y saneamiento de entradas (SPEC-SEC-02) | ✅ | RF-08 | Zod en el borde del controller; 2 tests 422 (campo faltante, tipo inválido) |
| Auditoría obligatoria (SPEC-SEC-04) | ✅ | RNF-05, CA-07 | `AuditoriaRepository.registrarEvento()` con `accion='CLASIFICAR'` y resultado en `detalle`; test verifica el registro directamente en BD |
| Consultas parametrizadas (SPEC-SEC-03) | ✅ (heredado, Prisma ORM) | OWASP A03 | Todas las queries vía Prisma Client, sin concatenación de strings |
| Sin secretos hardcodeados (SPEC-SEC-06) | ✅ (heredado) | — | Sin credenciales nuevas introducidas en esta sesión |
| Validación estricta de regla de negocio PEP (Art. 26) | ✅ | RN-01, RN-02 | `clasificarRiesgo()` hace que `esPEP=true` domine sobre cualquier valor de ingreso/volumen; test dedicado con PEP en el límite exacto de BAJO |

---

## 6. Métricas registradas en este punto

| Métrica | Valor | Herramienta | Variación vs Sesión 3 |
|---------|-------|-------------|----------------------|
| KLOC `src/` | **0.481** (481 líneas) | `wc -l src/**/*.ts` | +0.171 (S3: 0.31) |
| KLOC total (`src/` + `tests/`) | **1.472** (1472 líneas) | `wc -l` | +0.612 (S3: 0.86) |
| Cobertura — statements | **98.52%** (134/136) | Vitest v8 | +0.51 pp (S3: 98.01%) |
| Cobertura — branches | **91.3%** (42/46) | Vitest v8 | +1.3 pp (S3: 90%) |
| Cobertura — functions | **100%** (25/25) | Vitest v8 | Mantenida (S3: 100%) |
| Cobertura — lines | **98.44%** (127/129) | Vitest v8 | +0.49 pp (S3: 97.95%) |
| Complejidad ciclomática — `clasificarRiesgo()` | **V(G) = 4** (3 decisiones binarias + 1) | Conteo manual (ver detalle abajo) | Meta PRD ≤10 — **cumplida con margen amplio** |
| Complejidad ciclomática — `putPerfilEconomico()` (controller) | **V(G) = 3** (2 decisiones + 1) | Conteo manual | Dentro de meta |
| Complejidad ciclomática (SonarCloud, global) | Pendiente CI | SonarCloud | — |
| Code smells / Vulnerabilidades / Debt ratio | Pendiente CI | SonarCloud | — |
| Tests totales | **88** (42 unit + 46 integration) | Vitest | +24 (S3: 64) |
| Defectos detectados | 0 nuevos; 1 resuelto (DEF-S3-01) | Manual | -1 abierto |
| Horas-persona | (completar al cerrar la sesión) | Bitácora del equipo | — |

### Detalle — Complejidad ciclomática de `clasificarRiesgo()` (métrica protagonista de la sesión)

```typescript
export function clasificarRiesgo(p: PerfilRiesgo): 'BAJO' | 'NO_ELEGIBLE' {
  if (p.esPEP) return 'NO_ELEGIBLE';               // decisión 1
  if (p.ingresoMensual > 5000) return 'NO_ELEGIBLE';   // decisión 2
  if (p.volumenMensual > 10000) return 'NO_ELEGIBLE';  // decisión 3
  return 'BAJO';                                    // camino base
}
```

Fórmula aplicada: V(G) = número de decisiones binarias + 1 = 3 + 1 = **4**.

No hay bucles, ni condicionales compuestos (`&&`/`||`), ni `switch`. Cada rama
corresponde a exactamente un factor de la tabla de verdad de RN-01 (PEP,
ingreso, volumen), lo que mantiene la función trivialmente auditable: leer el
código es leer la regla de negocio. **Meta del PRD §11 (V(G) ≤ 10):
cumplida con amplio margen (60% por debajo del límite).**

Como referencia de contraste, el controller `putPerfilEconomico()` (que
coordina validación, lectura de cliente, persistencia, clasificación y
auditoría) mide V(G) = 3 (2 decisiones: `!parsed.success`, `!formulario`) —
la orquestación en la capa de interfaz permanece simple porque toda la
lógica de decisión de negocio vive en el dominio, confirmando el principio
de diseño del PRD §10 ("mantener la complejidad ciclomática baja en
`/domain`; evitar God class").

### Detalle de cobertura por archivo nuevo (Sesión 4)

| Archivo | % Stmts | % Branch | % Funcs | % Lines | Líneas sin cubrir |
|---------|---------|---------|---------|---------|-------------------|
| `src/domain/clasificacion.ts` | 100% | 100% | 100% | 100% | — |
| `src/infrastructure/repositories/perfil-economico.repository.ts` | 100% | 100% | 100% | 100% | — |
| `src/interfaces/controllers/perfil-economico.controller.ts` | 100% | 83.33% | 100% | 100% | L47 (rama `cliente?.esPep ?? false` cuando `cliente` es `null` — no hay test sin identificación previa) |

> Las líneas 51-58 de `identificacion.controller.ts` (90.47%) y la línea 21
> de `auditoria.repository.ts` (50% branch) son deuda heredada de la Sesión 3,
> sin cambios en esta sesión.

---

## 7. Defectos encontrados / resueltos

| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|
| DEF-S3-01 | `Decimal` importado de `@prisma/client` en `tests/integration/modelo.test.ts` lanza error TS2305 en `tsc --noEmit` | Baja | ✅ Resuelto | Import quitado; `new Decimal('X.XX')` reemplazado por literales numéricos. `tsc --noEmit` limpio |

Ningún defecto nuevo introducido en esta sesión (0 issues críticos/importantes en las revisiones de calidad de código; ver §10 para deuda técnica no bloqueante identificada).

---

## 8. Pruebas añadidas

| Archivo | Tipo | Qué cubre | Tests |
|---------|------|-----------|-------|
| `tests/unit/clasificacion.test.ts` | Unitario | Tabla de verdad completa de `clasificarRiesgo` (SPEC-RN-01): caso nominal BAJO, los 4 casos límite exactos (5000/5000.01/10000/10000.01), NO_ELEGIBLE independiente por ingreso, NO_ELEGIBLE independiente por volumen, dominancia de PEP (incl. en el límite exacto de BAJO), todos los factores elevados, valores cero | 10 |
| `tests/integration/perfil-economico.test.ts` | Integración | Endpoint `PUT /perfil-economico`: happy path BAJO, upsert idempotente, NO_ELEGIBLE por ingreso, NO_ELEGIBLE por volumen, 2 casos límite adicionales vía API, 422 campo faltante, 422 tipo inválido, 404 formulario inexistente, auditoría CLASIFICAR con resultado en `detalle`, persistencia de `clasificacionRiesgo` en `FormularioDDS`, NO_ELEGIBLE por PEP | 13 |

**Total nuevos: 23 tests | Total acumulado: 88 tests** (65 previos de Sesión 3 + 23 de esta sesión; el conteo exacto de "65" incluye 1 test unitario de `validaciones.test.ts` no contado en el cierre de S3, que registraba 64 — ver nota de corrección en Sesión 3, ítem menor sin impacto).

---

## 9. Commits de la sesión

| Hash | Mensaje | Archivos principales |
|------|---------|---------------------|
| `548d6e4` | `docs(spec): reestructurar plan a 9 sesiones con Sesion 8 dedicada a frontend` | `PRD.md`, `DEV_SPEC.md`, `PLAN_SESIONES.md` |
| `ac532fd` | `fix(tests): reemplazar import Decimal por literales numericos en modelo.test.ts (DEF-S3-01)` | `tests/integration/modelo.test.ts` |
| `d1ae662` | `test(clasificacion): tabla de verdad SPEC-RN-01 con casos limite (RF-06, Art. 26)` | `tests/unit/clasificacion.test.ts` |
| `4d96bf2` | `feat(domain): clasificarRiesgo pura V(G)=4 BAJO/NO_ELEGIBLE (SPEC-RN-01, RF-06)` | `src/domain/clasificacion.ts` |
| `d3ba40f` | `feat(infra): PerfilEconomicoRepository.upsertByFormularioId (RF-03, SPEC-API-05)` | `src/infrastructure/repositories/perfil-economico.repository.ts` |
| `cfdef7c` | `test(api): tests de integracion SPEC-API-05 perfil-economico (RF-03, RF-06)` | `tests/integration/perfil-economico.test.ts` |
| `b8317ea` | `feat(api): PUT /perfil-economico con clasificacion SPEC-RN-01 y auditoria CLASIFICAR (RF-03, RF-06, CA-07)` | `src/interfaces/controllers/perfil-economico.controller.ts`, `src/interfaces/routes/formularios.routes.ts` |

---

## 10. Pendientes y riesgos para la próxima sesión

### Deuda técnica identificada en revisión de código (no bloqueante)

| Ítem | Severidad | Notas |
|------|-----------|-------|
| Sin middleware de manejo de errores async en Express | Media | Ninguno de los 3 controllers (`identificacion`, `contacto`, `perfil-economico`) captura rechazos de promesas; un error en Prisma deja la request colgada en vez de responder 500. Heredado de Sesión 3; se agrava con más endpoints. Candidato a resolver en Sesión 6 (seguridad) |
| Sin `prisma.$transaction` en escrituras múltiples | Media | `perfil-economico.controller.ts` hace 3 escrituras secuenciales (perfil, formularioDDS, auditoría) sin atomicidad; un fallo entre el paso 2 y 3 dejaría una clasificación persistida sin auditoría (viola el espíritu de SPEC-SEC-04). Mismo patrón que Sesión 3; evaluar `$transaction` como mejora transversal, no solo de este endpoint |
| Sin `@unique` en `formularioId` de `PerfilEconomico`/`Cliente`/`DatosContacto` | Baja | El patrón `findFirst` + `create`/`update` tiene una ventana de carrera bajo doble envío concurrente; heredado del diseño de Sesión 2/3 |
| `esPEP` puede quedar obsoleto si se edita `identificacion` después de clasificar | Baja | `SPEC-API-07` (guardar) revalida PEP independientemente antes de aprobar, por lo que no permite una aprobación incorrecta — solo un valor de clasificación mostrado desactualizado hasta volver a invocar `/perfil-economico` |

### Para la Sesión 5 (RF-05, RF-07 — folio y checklist documental)
- `FolioService.generar()` con `SEQUENCE` (RN-03).
- Ciclo de medición completo sobre DEF003 (concurrencia de folios).
- Checklist de documentos con timestamp (CA-09); bloqueo si falta documento de identidad (RN-04, CA-08).

### Para la Sesión 8 (frontend, diferido)
- Badge reactivo de clasificación en tiempo real (DEF002) — listener `onChange` sobre el endpoint ya construido en esta sesión.
- Vista `GET /formularios/:id/perfil` que consume `PUT /api/formularios/:id/perfil-economico`.

### Riesgos
| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Ausencia de manejo de errores async puede ocultar fallos silenciosos en producción | Media | Resolver junto con la capa de seguridad/roles en Sesión 6 (middleware global de errores) |
| Falta de transacción en escrituras múltiples puede dejar auditoría incompleta ante fallo parcial | Baja-Media | Evaluar `prisma.$transaction` de forma transversal (no solo perfil-económico) antes de Sesión 9 (hardening) |
| Docker Desktop no iniciado al arrancar la sesión (ocurrió en esta sesión) | Media | Igual que el riesgo ya identificado en Sesión 3: incluir en el checklist pre-sesión `docker compose up postgres -d` |

---

## 11. Evidencia / capturas

```
# Suite completa — 88 tests, 10 archivos (cierre de Sesión 4):
 Test Files  10 passed (10)
      Tests  88 passed (88)
   Duration  3.08s

# Cobertura final (Vitest v8):
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   98.52 |     91.3 |     100 |   98.44 |
 ...e/repositories |     100 |       90 |     100 |     100 |
  ...repository.ts |     100 |       50 |     100 |     100 | 21
 ...es/controllers |   96.29 |     87.5 |     100 |   96.29 |
  ...controller.ts |   90.47 |    85.71 |     100 |   90.47 | 51-58
  ...controller.ts |     100 |    83.33 |     100 |     100 | 47
-------------------|---------|----------|---------|---------|-------------------

Statements   : 98.52% ( 134/136 )
Branches     : 91.3%  ( 42/46 )
Functions    : 100%   ( 25/25 )
Lines        : 98.44% ( 127/129 )

# Typecheck y lint:
npx tsc --noEmit   → sin errores
npm run lint       → sin errores ni warnings
```

> SonarCloud (complejidad ciclomática global, code smells, vulnerabilidades,
> debt ratio): pendiente del push a `main` y ejecución del pipeline de CI en
> GitHub Actions.
