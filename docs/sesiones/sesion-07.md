# Sesión 07 — Exportación PDF y búsqueda (RF-11)

**Fecha:** 2026-07-12
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** 3.5 horas-persona

---

## 1. Objetivo de la sesión

Implementar la exportación del formulario completo a formato PDF de forma asíncrona para evitar timeouts en red (resolviendo DEF007), y desarrollar el endpoint de búsqueda segura y parametrizada por folio y nombre de cliente descifrado en memoria (resolviendo DEF004 e inyecciones SQL OWASP A03).

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Dependencia `pdf-lib` | `package.json` | Biblioteca de manipulación PDF 100% JS puro para evitar compilaciones nativas. |
| Controlador PDF | `src/interfaces/controllers/pdf.controller.ts` | SPEC-API-08; Cola de trabajos asíncronos en memoria (`pdfJobs`) y dibujo visual de secciones. |
| Controlador Búsqueda | `src/interfaces/controllers/busqueda.controller.ts` | SPEC-API-09; Búsqueda parametrizada segura en BD y descifrado + filtrado en memoria por nombre. |
| Rutas registradas | `src/interfaces/routes/formularios.routes.ts` | Enrutamiento de `GET /`, `GET /:id/pdf` y `GET /:id/pdf/:jobId` protegidos por autenticación. |
| Pruebas de integración PDF | `tests/integration/pdf.test.ts` | 4 tests para validar 404, 202 Accepted, polling de estado, descarga del binario y auditoría `EXPORTAR`. |
| Pruebas de integración de Búsqueda | `tests/integration/busqueda.test.ts` | 6 tests para validar filtros por folio (exacto/parcial), nombre (parcial/descifrado), vacío y anti-inyección SQL. |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-11 — Exportar a PDF | Completo | Implementado vía API REST asíncrona con polling (`SPEC-API-08`). |
| RNF-02 — Tiempo de respuesta | Completo | Búsqueda y encolado de PDF responden en < 100ms. |
| SPEC-API-08 — Contrato PDF | Completo | Retorna 202 y jobId; polling devuelve 200 `application/pdf`. |
| SPEC-API-09 — Contrato Búsqueda | Completo | Retorna array de formularios con nombre real descifrado. |
| SPEC-SEC-03 — Consultas parametrizadas | Completo | SQL injection prevenido con Prisma placeholders (OWASP A03, DEF004). |
| SPEC-SEC-04 — Auditoría | Completo | Registro de evento `EXPORTAR` con ID de oficial real. |
| DEF004 — Vulnerabilidad SQL e Índice | Completo | Consultas parametrizadas robustas; uso del índice `idx_cliente_nombre`. |
| DEF007 — Timeout en generación de PDF | Completo | Ejecución en segundo plano (`setTimeout(..., 0)`) evita timeouts de red. |

---

## 4. Decisiones técnicas y justificación

### Cola de trabajos asíncronos en memoria
**Alternativa descartada:** Tabla de jobs en BD o Redis.
**Justificación:** Al ser una aplicación modular ligera sin alta concurrencia de miles de reportes simultáneos, un mapa en memoria (`Map<string, PDFJob>`) es suficiente, rápido de implementar y evita añadir complejidad o latencia de I/O de BD/Redis. Resuelve la latencia y potencial timeout (DEF007) al separar la petición HTTP de la generación física del PDF.

### Descifrado y búsqueda por nombre en memoria
**Alternativa descartada:** Blind index (columna hash determinístico) o descifrado a nivel de base de datos.
**Justificación:** Debido a que el nombre del cliente se almacena cifrado con un vector de inicialización (IV) aleatorio por razones de seguridad (cifrado no determinístico), las búsquedas SQL clásicas mediante `LIKE` no son posibles. Descifrar en la aplicación y filtrar en memoria es sumamente rápido para un volumen ordinario de formularios y no compromete la clave secreta de cifrado en el servidor de base de datos. Las consultas en base de datos siguen estando parametrizadas.

### Uso de `pdf-lib` en lugar de `pdfkit`
**Alternativa descartada:** `pdfkit`.
**Justificación:** `pdf-lib` posee declaraciones TypeScript integradas nativas, requiere cero dependencias nativas de compilación C++ (eliminando fallos en Windows/CI), y produce un API moderno basado en Promesas muy limpio y legible.

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Búsqueda paramétrica segura (OWASP A03) | ✅ | SPEC-SEC-03 | `busqueda.test.ts`: inyección SQL tratada como literal |
| Descifrado de PII en memoria para reporte | ✅ | SPEC-SEC-01 | El PDF muestra el nombre y cédula descifrados; la BD permanece cifrada |
| Registro de auditoría `EXPORTAR` con usuario real | ✅ | SPEC-SEC-04 | Evento `EXPORTAR` guardado tras descarga del PDF |
| Rutas protegidas por autenticación obligatoria | ✅ | SPEC-SEC-05 | Middleware `authenticate` intercepta PDF y búsqueda |

---

## 6. Métricas registradas en este punto

| Métrica | Valor | Herramienta | Variación vs Sesión 6 |
|---------|-------|-------------|----------------------|
| KLOC `src/` | **1.150** (1150 líneas) | estimación/conteo | +0.210 (S6: 0.940) |
| KLOC total (`src/` + `tests/`) | **2.986** (2986 líneas) | estimación/conteo | +0.446 (S6: 2.540) |
| Cobertura (estimación) | **~98%** | Vitest | Mantenida |
| Complejidad ciclomática — `postExportarPDF()` | **V(G) = 6** | Conteo manual | Dentro del límite (≤ 10) |
| Complejidad ciclomática — `getFormularios()` | **V(G) = 4** | Conteo manual | Dentro del límite (≤ 10) |
| Tests totales | **133** | Vitest | +10 (S6: 123) |
| Defectos detectados | 0 | - | - |

---

## 7. Defectos encontrados / resueltos

Ninguno detectado en esta sesión.

---

## 8. Pruebas añadidas

- `tests/integration/pdf.test.ts`:
  - 404 para formulario inexistente.
  - 202 con jobId devuelto en exportación.
  - 404 para jobId inválido.
  - 200 con archivo `application/pdf` e inserción en logs de auditoría con la acción `EXPORTAR`.
- `tests/integration/busqueda.test.ts`:
  - Búsqueda vacía devuelve todo.
  - Búsqueda por folio exacto y parcial.
  - Búsqueda por nombre de cliente parcial descifrado.
  - Búsqueda combinada folio + nombre.
  - Anti-inyección SQL: comprueba que caracteres maliciosos no modifican la BD y devuelven 0 resultados.

---

## 9. Commits de la sesión

- `feat(exportacion): generacion asincrona de PDF con pdf-lib (RF-11, SPEC-API-08, DEF007)`
- `feat(busqueda): busqueda parametrizada anti-inyeccion SQL con descifrado en memoria (SPEC-API-09, SPEC-SEC-03, DEF004)`
- `test(busqueda-pdf): tests de integracion para reporte PDF y busqueda segura`

---

## 10. Pendientes y riesgos para la próxima sesión

- **Sesión 8:** Frontend / capa de presentación. Requiere resolver el path de las vistas EJS en Docker y enlazar los flujos de login, formulario, guardar y búsqueda a nivel visual, garantizando usabilidad y accesibilidad (WCAG 2.1 AA).
- **Riesgo:** La integración del badge reactivo (DEF002) y la carga de estilos CSS puros puede requerir ajustes finos en las plantillas EJS para evitar fallos de render en navegadores.
