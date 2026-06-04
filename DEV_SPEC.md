# DEV SPEC — Spec-Driven Development (SDD)
## Sistema de Debida Diligencia Simplificada (DDS)

**Proyecto:** Sistema web DDS para SSNF · Ley 23 de 2015
**Asignatura:** Ingeniería de Software Aplicada IV — Parcial 2, Unidad 2
**Stack:** Node.js + TypeScript + Express + PostgreSQL
**Documentos hermanos:** `PRD.md` · `PLAN_SESIONES.md`

---

## 0. Qué es este documento y cómo se usa (filosofía SDD)

En **Spec-Driven Development**, la especificación es la **fuente de verdad**. El flujo es:

```
Spec  →  Test (derivado de la spec)  →  Código (hasta que el test pasa)  →  Métrica (verifica)
```

Reglas de oro de este documento:

1. **No se escribe código sin una spec.** Si algo no está aquí, primero se especifica.
2. **Cada spec es verificable.** Tiene un ID y un criterio objetivo de cumplimiento; de ella nace al menos un test (Vitest/Supertest).
3. **La spec manda sobre el código.** Si el código diverge de la spec, o se corrige el código, o se actualiza la spec con justificación (y eso cuenta como volatilidad de requisitos).
4. **Toda spec se enlaza a un requisito** (RF/RNF/RN del PRD) y, cuando aplica, a un **artículo de la Ley 23**.

### Convención de IDs de spec
| Prefijo | Tipo de spec |
|---------|--------------|
| `SPEC-DATA-xx` | Modelo de datos / esquema |
| `SPEC-API-xx` | Contrato de endpoint |
| `SPEC-RN-xx` | Regla de negocio (función verificable) |
| `SPEC-SEC-xx` | Control de seguridad |
| `SPEC-BHV-xx` | Comportamiento (Given/When/Then → test) |

---

## 1. Especificación del modelo de datos

DDL de referencia (PostgreSQL). Es contrato: los tipos, restricciones e índices deben implementarse tal cual.

### SPEC-DATA-01 — Secuencia y tabla de formulario (RF-07, RN-03, Art. 55)
```sql
CREATE SEQUENCE seq_folio_dds START 1;

CREATE TABLE formulario_dds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           VARCHAR(20) NOT NULL UNIQUE,           -- DDS-AAAA-NNNNNN
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  proposito       TEXT NOT NULL,
  clasificacion_riesgo VARCHAR(20),                       -- 'BAJO' | null
  estado          VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',-- BORRADOR|GUARDADO|APROBADO
  fecha_cierre    DATE,
  fecha_expiracion DATE,                                  -- fecha_cierre + 5 años (RN-05)
  oficial_id      UUID NOT NULL REFERENCES oficial(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Criterio de cumplimiento:** la columna `folio` es `UNIQUE`; el folio se obtiene de `seq_folio_dds`; bajo inserciones concurrentes nunca se duplica (resuelve DEF003).

### SPEC-DATA-02 — Cliente (RF-01, Art. 24)
```sql
CREATE TABLE cliente (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES formulario_dds(id) ON DELETE CASCADE,
  nombre        VARCHAR(200) NOT NULL,            -- cifrado en reposo (SPEC-SEC-01)
  tipo_documento VARCHAR(40) NOT NULL,
  num_documento VARCHAR(40) NOT NULL,             -- cifrado en reposo
  fecha_nacimiento DATE,
  nacionalidad  VARCHAR(60) NOT NULL,
  tipo_cliente  VARCHAR(20) NOT NULL,             -- NATURAL | JURIDICA
  es_pep        BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_cliente_nombre ON cliente (nombre);  -- resuelve DEF004 (búsqueda)
```

### SPEC-DATA-03 — Contacto, perfil, documento, oficial, auditoría
```sql
CREATE TABLE datos_contacto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES formulario_dds(id) ON DELETE CASCADE,
  direccion TEXT NOT NULL, telefono VARCHAR(40) NOT NULL,
  correo VARCHAR(120) NOT NULL, fecha_verif TIMESTAMPTZ
);

CREATE TABLE perfil_economico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES formulario_dds(id) ON DELETE CASCADE,
  actividad VARCHAR(120) NOT NULL, fuente_ingresos VARCHAR(120) NOT NULL,
  ingreso_mensual NUMERIC(12,2) NOT NULL,
  volumen_transacciones NUMERIC(12,2) NOT NULL
);

CREATE TABLE documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES formulario_dds(id) ON DELETE CASCADE,
  tipo VARCHAR(80) NOT NULL, fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT now(),
  verificado BOOLEAN NOT NULL DEFAULT false, base_legal VARCHAR(80)
);

CREATE TABLE oficial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL, cargo VARCHAR(20) NOT NULL,  -- OFICIAL | SUPERVISOR
  email VARCHAR(120) NOT NULL UNIQUE, hash_password VARCHAR(255) NOT NULL
);

CREATE TABLE log_auditoria (                                 -- RNF-05, Art. 55
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id UUID REFERENCES oficial(id),
  accion VARCHAR(40) NOT NULL,                               -- CREAR|MODIFICAR|CLASIFICAR|EXPORTAR|ACCEDER
  entidad VARCHAR(40) NOT NULL, entidad_id UUID, detalle JSONB
);
```

---

## 2. Especificación de reglas de negocio (funciones puras y verificables)

Las reglas de negocio se implementan como **funciones puras** en `/src/domain`, sin dependencias de BD ni red. Esto las hace fáciles de probar y mantiene baja la complejidad ciclomática.

### SPEC-RN-01 — Clasificación de riesgo (RF-06, RN-01, Art. 26)
```typescript
interface PerfilRiesgo { ingresoMensual: number; volumenMensual: number; esPEP: boolean; }
function clasificarRiesgo(p: PerfilRiesgo): 'BAJO' | 'NO_ELEGIBLE';
```
**Tabla de verdad (contrato):**

| ingresoMensual | volumenMensual | esPEP | Resultado |
|----------------|----------------|-------|-----------|
| ≤ 5000 | ≤ 10000 | false | `BAJO` |
| > 5000 | cualquiera | cualquiera | `NO_ELEGIBLE` |
| cualquiera | > 10000 | cualquiera | `NO_ELEGIBLE` |
| cualquiera | cualquiera | true | `NO_ELEGIBLE` |

**Casos límite obligatorios:** 5000 → BAJO; 5000.01 → NO_ELEGIBLE; 10000 → BAJO; 10000.01 → NO_ELEGIBLE.

### SPEC-RN-02 — Validación de cédula panameña (RN-07, resuelve DEF001)
```typescript
function esCedulaValida(valor: string): boolean;  // regex: /^\d{1,2}-\d{1,4}-\d{1,6}$/ (formato X-XXX-XXXX)
```
**Criterio:** `12345` → false; `8-123-4567` → true.

### SPEC-RN-03 — Formato de folio (RF-07, RN-03)
```typescript
function formatearFolio(anio: number, secuencia: number): string; // 'DDS-2026-000042'
```
**Criterio:** patrón `^DDS-\d{4}-\d{6}$`; secuencia con padding a 6 dígitos.

### SPEC-RN-04 — Cálculo de expiración (RF-10, RN-05, Art. 55)
```typescript
function calcularExpiracion(fechaCierre: Date): Date; // fechaCierre + 5 años exactos
```

### SPEC-RN-05 — Elegibilidad PEP para DDS (RF-12, RN-02, Art. 26)
```typescript
function puedeGuardarseComoDDS(p: PerfilRiesgo): boolean; // false si esPEP === true
```

---

## 3. Especificación de contratos de API

Convenciones globales:
- Base: `/api`. JSON en request/response. Fechas ISO-8601.
- **Toda** ruta de datos requiere autenticación (JWT/sesión) salvo `/api/auth/login`.
- **Toda** mutación escribe en `log_auditoria` (SPEC-SEC-04).
- Errores con forma: `{ "error": { "codigo": "...", "mensaje": "...", "campos": {...} } }`.
- Validación de entrada con esquema (Zod) — rechazo `422` si no cumple (SPEC-SEC-02).

### SPEC-API-01 — Autenticación
```
POST /api/auth/login
Body:    { email: string, password: string }
200:     { token: string, rol: 'OFICIAL'|'SUPERVISOR' }
401:     credenciales inválidas
```

### SPEC-API-02 — Crear borrador de formulario (RF-07)
```
POST /api/formularios            [rol: OFICIAL, SUPERVISOR]
Body:    { proposito: string }
201:     { id, folio: null, estado: 'BORRADOR' }    -- folio se asigna al guardar
Auditoría: accion=CREAR, entidad=formulario_dds
```

### SPEC-API-03 — Registrar identificación (RF-01, RF-08)
```
PUT /api/formularios/:id/identificacion           [rol: OFICIAL, SUPERVISOR]
Body:    { nombre, tipoDocumento, numDocumento, fechaNacimiento?, nacionalidad, tipoCliente, esPEP }
200:     { ok: true }
422:     formato de documento inválido (SPEC-RN-02) | campos obligatorios vacíos (RF-08)
Auditoría: accion=MODIFICAR
```

### SPEC-API-04 — Registrar contacto (RF-02)
```
PUT /api/formularios/:id/contacto                 [rol: OFICIAL, SUPERVISOR]
Body:    { direccion, telefono, correo }
200:     { ok: true }
422:     correo o teléfono con formato inválido
```

### SPEC-API-05 — Registrar perfil económico y clasificar (RF-03, RF-06)
```
PUT /api/formularios/:id/perfil-economico         [rol: OFICIAL, SUPERVISOR]
Body:    { actividad, fuenteIngresos, ingresoMensual, volumenTransacciones }
200:     { clasificacionRiesgo: 'BAJO'|'NO_ELEGIBLE' }   -- aplica SPEC-RN-01
Auditoría: accion=CLASIFICAR (registra resultado, RNF-05, CA-07)
```

### SPEC-API-06 — Registrar documentos (RF-05)
```
POST /api/formularios/:id/documentos              [rol: OFICIAL, SUPERVISOR]
Body:    { tipo, baseLegal? }
201:     { id, fechaRecepcion }                     -- timestamp automático (CA-09)
```

### SPEC-API-07 — Guardar formulario (RF-07, RF-08, RF-12, RN-02, RN-03, RN-04)
```
POST /api/formularios/:id/guardar                 [rol: OFICIAL, SUPERVISOR]
Precondiciones verificadas en este orden:
  1. Campos obligatorios completos (RF-08)            -> 422 si falla
  2. Documento de identidad verificado (RN-04, CA-08) -> 422 si falla
  3. Cliente NO es PEP (RN-02, SPEC-RN-05)            -> 409 + redirección reforzada (RF-12, CA-04)
  4. Genera folio único (SPEC-RN-03, SPEC-DATA-01)
  5. estado -> 'GUARDADO'
200:     { folio: 'DDS-2026-000042', estado: 'GUARDADO' }
409:     { error: { codigo:'PEP_NO_ELEGIBLE', mensaje:'Cliente PEP: requiere Diligencia Reforzada (Art. 26)' } }
```
> El mensaje del 409 es específico por contrato (resuelve DEF006).

### SPEC-API-08 — Exportar a PDF (RF-11, resuelve DEF007)
```
GET /api/formularios/:id/pdf                       [rol: OFICIAL, SUPERVISOR]
202:     { jobId }            -- generación asíncrona para evitar timeout
GET /api/formularios/:id/pdf/:jobId
200:     application/pdf       -- cuando está listo
Auditoría: accion=EXPORTAR
```

### SPEC-API-09 — Búsqueda (resuelve DEF004; SPEC-SEC-03)
```
GET /api/formularios?folio=&nombre=                [rol: OFICIAL, SUPERVISOR]
200:     [ { id, folio, nombre, clasificacionRiesgo, fecha } ]
Requisitos: consulta parametrizada (no concatenación); usa idx_cliente_nombre; ≤ 3s (RNF-02)
```

### SPEC-API-10 — Edición de formulario aprobado (RN-06)
```
PUT /api/formularios/:id                           [rol: SUPERVISOR únicamente]
403:     si el rol es OFICIAL y el formulario está APROBADO
```

---

## 4. Especificación de seguridad (Ley 23 — transversal)

### SPEC-SEC-01 — Cifrado en reposo (RNF-04, Art. 55)
Campos `cliente.nombre` y `cliente.num_documento` cifrados con AES-256 antes de persistir.
**Criterio:** un `SELECT` directo a la BD no devuelve el dato en claro.

### SPEC-SEC-02 — Saneamiento y validación de entrada
Todo body se valida con esquema (Zod) en el borde del controlador. Entrada no conforme → `422`, nunca llega al dominio.
**Criterio:** payloads con tipos incorrectos o campos extra son rechazados.

### SPEC-SEC-03 — Consultas parametrizadas (OWASP A03, resuelve DEF004)
Prohibida la concatenación de strings en SQL. Todo parámetro va por placeholders del cliente/ORM.
**Criterio:** un nombre con `'; DROP TABLE ...` se trata como literal, no se ejecuta.

### SPEC-SEC-04 — Auditoría obligatoria (RNF-05)
Toda operación de acceso/creación/modificación/clasificación/exportación inserta un registro en `log_auditoria` con usuario, acción, entidad y timestamp.
**Criterio:** cobertura de eventos auditados ≥ 90%.

### SPEC-SEC-05 — Control de acceso por rol (RNF-01)
Middleware de autorización por endpoint. `OFICIAL` y `SUPERVISOR` con permisos del PRD §4.
**Criterio:** petición sin token → `401`; rol insuficiente → `403`.

### SPEC-SEC-06 — Sin secretos en código
Credenciales, claves y cadenas de conexión solo por variables de entorno.
**Criterio:** SonarQube no reporta secretos hardcodeados.

### SPEC-SEC-07 — Cabeceras y transporte (RNF-04)
`helmet` activo; HTTPS/TLS forzado en despliegue; sesiones seguras.

---

## 5. Especificaciones de comportamiento (Given/When/Then → tests)

Cada `SPEC-BHV` se traduce en un test de Vitest/Supertest. Es el puente directo entre la spec y la suite automatizada.

### SPEC-BHV-01 (← RF-06, SPEC-RN-01)
```
Given un perfil con ingreso 4900, volumen 8000 y esPEP=false
When  se clasifica el riesgo
Then  el resultado es 'BAJO' y el badge verde se activa (CA-05)
```

### SPEC-BHV-02 (← RF-12, RN-02)
```
Given un cliente con esPEP=true
When  se intenta guardar como DDS
Then  la respuesta es 409 con codigo 'PEP_NO_ELEGIBLE' y mensaje del Art. 26 (CA-04, DEF006)
```

### SPEC-BHV-03 (← RN-07, DEF001)
```
Given el número de documento '12345'
When  se registra la identificación
Then  la respuesta es 422 por formato de cédula inválido (CA-01)
```

### SPEC-BHV-04 (← RF-08, CA-02)
```
Given un formulario sin nombre
When  se intenta guardar
Then  la respuesta es 422 y se indican los campos faltantes
```

### SPEC-BHV-05 (← RF-07, RN-03, DEF003)
```
Given 50 solicitudes concurrentes de guardado
When  se generan los folios
Then  todos los folios son únicos (0 duplicados) y siguen el patrón DDS-AAAA-NNNNNN (CA-03)
```

### SPEC-BHV-06 (← RN-04, CA-08)
```
Given un formulario sin documento de identidad verificado
When  se intenta guardar
Then  la respuesta es 422 y se bloquea el guardado
```

### SPEC-BHV-07 (← RF-10, RN-05, Art. 55)
```
Given un formulario que se cierra hoy
When  se calcula la expiración
Then  fecha_expiracion = hoy + 5 años exactos
```

### SPEC-BHV-08 (← SPEC-SEC-05, RNF-01)
```
Given una petición sin token a un endpoint protegido
When  se procesa
Then  la respuesta es 401
And   con rol OFICIAL sobre un formulario APROBADO la edición devuelve 403 (RN-06)
```

### SPEC-BHV-09 (← SPEC-SEC-03, DEF004)
```
Given una búsqueda por nombre con un intento de inyección SQL
When  se ejecuta la consulta parametrizada
Then  no se altera la base de datos y la búsqueda responde en ≤ 3s (RNF-02)
```

---

## 6. Trazabilidad spec → requisito → prueba

| Spec | Requisito | Artículo | Prueba | Defecto |
|------|-----------|----------|--------|---------|
| SPEC-RN-01 / BHV-01 | RF-06 | Art. 26 | clasificacion.test.ts | DEF002 |
| SPEC-RN-02 / BHV-03 | RN-07 | Art. 24 | cedula.test.ts | DEF001 |
| SPEC-API-07 / BHV-02 | RF-12 | Art. 26 | pep.test.ts | DEF006 |
| SPEC-DATA-01 / BHV-05 | RF-07 | Art. 55 | folio.concurrencia.test.ts | DEF003 |
| SPEC-API-08 | RF-11 | — | pdf.test.ts | DEF007 |
| SPEC-SEC-03 / BHV-09 | RNF-02 | — | busqueda.test.ts | DEF004 |
| SPEC-RN-04 / BHV-07 | RF-10 | Art. 55 | retencion.test.ts | — |
| SPEC-SEC-05 / BHV-08 | RNF-01 | — | autorizacion.test.ts | — |

---

## 7. Definition of Done (basada en specs)

Una funcionalidad está **terminada** solo cuando:

- [ ] Tiene su spec en este documento (o se actualizó con justificación).
- [ ] Existe al menos un test que verifica la spec y **pasa**.
- [ ] La cobertura de la lógica de negocio asociada es ≥ 80%.
- [ ] SonarQube: 0 vulnerabilidades críticas/altas y 0 nuevos code smells de severidad alta.
- [ ] Complejidad ciclomática de los métodos nuevos ≤ 10.
- [ ] Si toca datos sensibles, cumple los SPEC-SEC aplicables.
- [ ] La operación queda auditada (si es mutación).
- [ ] El commit referencia el requisito (`feat(...): ... (RF-XX)`).
- [ ] Queda registrada en la documentación de cierre de la sesión.

---

## 8. Cómo se conecta con el flujo de sesiones

Cada sesión del `PLAN_SESIONES.md` implementa un subconjunto de specs:

| Sesión | Specs principales |
|--------|-------------------|
| 1 | (infraestructura; sin specs de negocio) |
| 2 | SPEC-DATA-01..03, SPEC-SEC-01 |
| 3 | SPEC-API-03/04, SPEC-RN-02, SPEC-SEC-02, SPEC-BHV-03/04 |
| 4 | SPEC-RN-01, SPEC-API-05, SPEC-BHV-01 |
| 5 | SPEC-RN-03, SPEC-API-06/07 (folio), SPEC-DATA-01, SPEC-BHV-05/06 |
| 6 | SPEC-SEC-04/05, SPEC-API-07 (PEP)/10, SPEC-RN-05, SPEC-BHV-02/08 |
| 7 | SPEC-API-08/09, SPEC-SEC-03, SPEC-BHV-09 |
| 8 | SPEC-SEC-06/07, SPEC-RN-04, SPEC-BHV-07; cierre de métricas |

---

*Spec-Driven Development: la especificación es el contrato. El código existe para satisfacerla, y los tests existen para demostrar que la satisface. Toda referencia legal proviene de la Ley 23 de 2015, la Ley 254 de 2021 y los Acuerdos de la SSNF, según la entrega del Parcial 1.*
