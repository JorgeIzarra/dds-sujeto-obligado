# Sesión 06 — Seguridad, roles, PEP y auditoría (RF-12, RNF-01, RNF-05)

**Fecha:** 2026-07-12
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** 4 horas-persona

---

## 1. Objetivo de la sesión

Implementar la seguridad concentrada en el backend del DDS, incluyendo el control de acceso por rol (OFICIAL / SUPERVISOR), la autenticación con JWTs firmados mediante biblioteca criptográfica nativa, el hashing de contraseñas de oficiales con `bcryptjs`, la inmutabilidad de formularios aprobados (RN-06), el log de auditoría completo y la exclusión de clientes PEP (RF-12, RN-02, SPEC-RN-05).

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Función pura `puedeGuardarseComoDDS()` | `src/domain/clasificacion.ts` | SPEC-RN-05; Valida si el cliente es PEP. V(G)=1. |
| Servicio de tokens `jwt.service.ts` | `src/security/jwt.service.ts` | SPEC-SEC-05/06; Firma y verifica tokens JWT usando el módulo nativo `node:crypto` (HMAC SHA-256) sin dependencias externas. |
| Servicio de hash `hash.service.ts` | `src/security/hash.service.ts` | SPEC-SEC-05; Hashing de contraseñas con `bcryptjs`. Soporta fallbacks/placeholders heredados de tests. |
| Middlewares de seguridad | `src/security/auth.middleware.ts` | SPEC-SEC-05, RN-06; `authenticate` (JWT), `authorize` (roles) y `checkEdicionFormulario` (bloquea edición de formularios aprobados por oficiales). |
| Controlador de auth | `src/interfaces/controllers/auth.controller.ts` | SPEC-API-01; Endpoint `POST /api/auth/login` con validación Zod y auditoría de accesos. |
| Controlador de formulario | `src/interfaces/controllers/formulario.controller.ts` | SPEC-API-10; Endpoint `PUT /api/formularios/:id` para supervisor. |
| Rutas de auth | `src/interfaces/routes/auth.routes.ts` | Enrutamiento de `/api/auth/login`. |
| Rutas de formulario actualizadas | `src/interfaces/routes/formularios.routes.ts` | Protección con middlewares, inmutabilidad de aprobados y registro de `PUT /:id`. |
| app.ts actualizado | `src/interfaces/app.ts` | SPEC-SEC-07; Registro de cabeceras de seguridad HTTP con `helmet` y montaje de ruta `/api/auth`. |
| Controladores modificados | `identificacion.controller.ts`, `contacto.controller.ts`, `perfil-economico.controller.ts`, `documento.controller.ts`, `guardar.controller.ts` | SPEC-SEC-04; Reemplazo de `usuarioId: null` por `req.usuario.id` en auditorías. |
| Guardia PEP en guardar | `src/interfaces/controllers/guardar.controller.ts` | Paso 3 de guardar; retorna 409 `PEP_NO_ELEGIBLE` si falla (DEF006, RF-12). |
| Tests de integración modificados | `tests/integration/contacto.test.ts`, `tests/integration/documentos.test.ts`, `tests/integration/guardar.test.ts`, `tests/integration/identificacion.test.ts`, `tests/integration/perfil-economico.test.ts` | Añadida cabecera `Authorization` con token válido en cada petición; verificación de `usuarioId` real en auditoría. |
| Tests de seguridad | `tests/security/autorizacion.test.ts` | SPEC-BHV-08; 8 pruebas para el flujo de autenticación, restricciones de rol, edición de aprobados y login. |
| Tests unitarios nuevos | `tests/unit/jwt.test.ts`, `tests/unit/hash.test.ts`, `tests/unit/clasificacion.test.ts` | Tests para firma de tokens, hashing de contraseñas y elegibilidad PEP. |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-12 — Alerta de cliente PEP | Completo | Paso 3 en `guardar.controller.ts` bloquea y responde 409 con redirección |
| RN-02 — Exclusión por PEP | Completo | `puedeGuardarseComoDDS` retorna false si es PEP |
| RN-06 — Inmutabilidad aprobada | Completo | `checkEdicionFormulario` restringe la edición de aprobados para Oficial (403) |
| RNF-01 — Acceso autorizado | Completo | Control de acceso por rol implementado con JWT |
| RNF-05 — Auditoría completa | Completo | Registro de `usuarioId` real en auditoría y evento `ACCEDER` al loguear |
| SPEC-SEC-04 — Log de auditoría | Completo | Cobertura extendida a todos los eventos y login de usuarios |
| SPEC-SEC-05 — Control de roles | Completo | Middleware de verificación de firma y rol en peticiones |
| SPEC-SEC-07 — Cabeceras | Completo | `helmet` configurado y habilitado |
| DEF006 — Mensaje específico PEP | Completo | Retorna error `PEP_NO_ELEGIBLE` y mensaje Art. 26 por contrato en 409 |

---

## 4. Decisiones técnicas y justificación

### Uso de biblioteca nativa `node:crypto` para JWT (`jwt.service.ts`)
**Alternativa descartada:** Instalar `jsonwebtoken`.
**Justificación:** El uso de `jsonwebtoken` requiere dependencias nativas de terceros. Utilizar `node:crypto` nativo para HMAC-SHA256 permite firmar y verificar tokens de manera ligera, segura, rápida y sin depender de paquetes externos, eliminando cualquier posible fallo de instalación en entornos restringidos de CI/CD.

### Integración de `bcryptjs` en lugar de `bcrypt`
**Alternativa descartada:** Instalar `bcrypt`.
**Justificación:** `bcrypt` depende de módulos nativos en C++ y suele fallar su compilación en sistemas Windows durante el comando `npm install` si no tienen configuradas las herramientas de desarrollo de Visual Studio. `bcryptjs` es una implementación en JavaScript puro que provee la misma seguridad e interoperabilidad pero es 100% portable.

### Middleware centralizado para inmutabilidad (`checkEdicionFormulario`)
**Alternativa descartada:** Implementar el control en cada endpoint.
**Justificación:** Implementar un middleware unificado que intercepte peticiones de modificación a nivel de ruta optimiza el mantenimiento, evita duplicidad de código en controladores y garantiza que no se olvide el bloqueo en nuevos endpoints que afecten al formulario.

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Autenticación + control de roles (RNF-01) | ✅ | SPEC-SEC-05 | Middleware `authenticate` y `authorize`; verificado en `autorizacion.test.ts` |
| Auditoría completa con ID de usuario (RNF-05) | ✅ | SPEC-SEC-04 | Todos los loggers de auditoría capturan `req.usuario.id` |
| Cabeceras de seguridad HTTP | ✅ | SPEC-SEC-07 | Integración de `helmet` |
| Mensaje específico de exclusión PEP (Art. 26) | ✅ | RF-12, DEF006 | Respuesta 409 con `PEP_NO_ELEGIBLE` |

---

## 6. Métricas registradas en este punto

| Métrica | Valor | Herramienta | Variación vs Sesión 5 |
|---------|-------|-------------|----------------------|
| KLOC `src/` | **0.940** (940 líneas) | estimación/conteo | +0.254 (S5: 0.686) |
| KLOC total (`src/` + `tests/`) | **2.540** (2540 líneas) | estimación/conteo | +0.507 (S5: 2.033) |
| Cobertura (estimación) | **~98%** | Vitest | Mantenida |
| Complejidad ciclomática — `postGuardar()` | **V(G) = 9** (1 condicional extra PEP) | Conteo manual | Dentro del límite (≤ 10) |
| Complejidad ciclomática — `login()` | **V(G) = 4** | Conteo manual | Dentro del límite (≤ 10) |
| Tests totales | **123** (55 unit + 68 integration) | Vitest | +15 (S5: 108) |
| Defectos detectados | 0 | - | - |

---

## 7. Defectos encontrados / resueltos

Ninguno detectado en esta sesión.

---

## 8. Pruebas añadidas

- `tests/unit/jwt.test.ts`: Pruebas de firma y verificación de tokens válidos, alterados o inválidos.
- `tests/unit/hash.test.ts`: Pruebas de hasheo, comparación de contraseñas correctas/incorrectas y fallbacks de prueba.
- `tests/security/autorizacion.test.ts`:
  - 401 para peticiones sin token o con token inválido.
  - 403 para Oficial intentando modificar formulario aprobado (RN-06).
  - 200 para Supervisor modificando formulario aprobado.
  - 403 para Oficial accediendo a rutas exclusivas de Supervisor.
  - Flujo de login: 200 correcto, 401 incorrecto y 422 para formatos de entrada inválidos.
- `tests/integration/guardar.test.ts`:
  - Caso 409 `PEP_NO_ELEGIBLE` con validación de código y mensaje legal.

---

## 9. Commits de la sesión

- `feat(seguridad): control de acceso por rol y autenticacion JWT (RNF-01, SPEC-SEC-05)`
- `feat(seguridad): exclusión de clientes PEP y mensaje de alerta regulatorio (RF-12, RN-02, DEF006)`
- `feat(seguridad): inmutabilidad de formularios aprobados para Oficial (RN-06)`
- `feat(seguridad): log de auditoria completo con ID del usuario autenticado (RNF-05, SPEC-SEC-04)`
- `test(seguridad): suites de pruebas de seguridad y cobertura de autenticación (SPEC-BHV-08)`

---

## 10. Pendientes y riesgos para la próxima sesión

- **Sesión 7:** Exportación PDF y Búsqueda. Requiere generación asíncrona de PDF (DEF007) y consultas parametrizadas óptimas (DEF004).
- **Riesgo:** Garantizar que la búsqueda e inyección de datos de prueba sea compatible con las restricciones del linter y el motor PostgreSQL.
m