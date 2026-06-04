# PLAN DE SESIONES — Sistema de Debida Diligencia Simplificada (DDS)

**Proyecto:** Sistema web DDS para SSNF · Ley 23 de 2015
**Asignatura:** Ingeniería de Software Aplicada IV — Parcial 2, Unidad 2
**Metodología:** desarrollo incremental por sesiones, con medición y documentación al cierre de cada una.
**Documento hermano:** `PRD.md`

---

## Cómo funciona este plan

El proyecto se divide en **8 sesiones**. Cada sesión produce código, pruebas, un commit (o varios) y —obligatoriamente— **un documento de cierre detallado** que captura las métricas de ese punto en el tiempo.

> **Por qué documentar tanto al final de cada sesión:** la documentación de cierre **no es burocracia, es la recolección de datos del Parcial 2.** Ocho cierres = ocho snapshots de KLOC, cobertura, complejidad, code smells, vulnerabilidades y defectos. Esa serie de 8 puntos es lo que permite mostrar la **evolución de las métricas en el tiempo**, que es justo lo que hace destacar la entrega. Si no se documenta al cierre, el dato se pierde para siempre.

### Regla de oro
Ninguna sesión se da por cerrada hasta que su documento de cierre (`/docs/sesiones/sesion-NN.md`) esté completo, commiteado y con las métricas registradas.

---

## Convenciones de commits (alimenta productividad)

Usar **Conventional Commits** para que el historial sea analizable:
```
feat:     nueva funcionalidad
fix:      corrección de defecto (referenciar DEF-XXX cuando aplique)
test:     pruebas
docs:     documentación
refactor: refactor sin cambio de comportamiento
security: control o corrección de seguridad
chore:    infraestructura, configuración
```
Ejemplo: `feat(clasificacion): aplicar umbrales del Art. 26 (RF-06)`
Commitear frecuentemente y siempre al cerrar la sesión.

---

## Plantilla obligatoria de documentación de cierre

**Copiar esta plantilla en `/docs/sesiones/sesion-NN.md` y completarla TODA al final de cada sesión.** No dejar campos vacíos; si una métrica no aplica aún, escribir "N/A" y por qué.

```markdown
# Sesión NN — [Título]

**Fecha:** AAAA-MM-DD
**Participantes:** [nombres]
**Duración:** [horas-persona totales del equipo]

## 1. Objetivo de la sesión
[Qué se propuso lograr]

## 2. Trabajo realizado
[Descripción detallada de lo construido, función por función]

## 3. Requisitos abordados
| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-XX     | Completo / Parcial | |

## 4. Decisiones técnicas y justificación
[Por qué se eligió cada enfoque; alternativas descartadas]

## 5. Controles de seguridad aplicados (Ley 23)
[Qué control de §7 del PRD se implementó/midió en esta sesión]

## 6. Métricas registradas en este punto
| Métrica | Valor | Herramienta | Variación vs sesión anterior |
|---------|-------|-------------|------------------------------|
| KLOC | | conteo/SonarQube | |
| Cobertura de código (%) | | Vitest | |
| Complejidad ciclomática (máx/prom) | | SonarQube | |
| Code smells | | SonarQube | |
| Vulnerabilidades (crít/altas) | | SonarQube | |
| Debt ratio (%) | | SonarQube | |
| Defectos detectados | | manual/tests | |
| Horas-persona | | bitácora | |

## 7. Defectos encontrados / resueltos
| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|

## 8. Pruebas añadidas
[Lista de tests nuevos y qué cubren]

## 9. Commits de la sesión
[Hashes y mensajes principales]

## 10. Pendientes y riesgos para la próxima sesión
[Qué queda abierto]

## 11. Evidencia / capturas
[Dashboard de SonarQube, salida de cobertura, etc.]
```

---

## Las 8 sesiones

### Sesión 1 — Infraestructura y arnés de medición
**Objetivo:** dejar todo listo para que desde la Sesión 2 ya se pueda medir. **Sin lógica de negocio.**
- Inicializar repositorio Git (commit inicial).
- Configurar proyecto Node + TypeScript + Express.
- `Dockerfile` + `docker-compose.yml` (app + PostgreSQL).
- Configurar Vitest + Supertest + reporte de cobertura (lcov).
- Configurar ESLint + Prettier.
- Integrar SonarQube/SonarCloud (`sonar-project.properties`).
- Configurar CI (GitHub Actions: lint + test + análisis en cada push).
- Crear estructura de carpetas (§10 del PRD) y carpeta `/docs/sesiones`.
- Copiar `PRD.md` al repo.

**Criterio de cierre:** el pipeline corre verde en un push de prueba; SonarQube muestra un proyecto (vacío) analizado.
**Métrica que aporta:** **línea base en cero** — todo medible aunque sin código de negocio.
**Documentación de cierre:** plantilla completa (las métricas estarán en cero, pero se registra el setup y la línea base).

---

### Sesión 2 — Modelo de datos y persistencia
**Objetivo:** entidades y base de datos.
- Definir entidades del §8 del PRD (`FormularioDDS`, `Cliente`, `DatosContacto`, `PerfilEconomico`, `Documento`, `Oficial`, `LogAuditoria`).
- Migraciones de PostgreSQL.
- `SEQUENCE` + restricción `UNIQUE` para el folio (prepara la solución de DEF003).
- Cifrado en reposo de campos PII (Art. 55 / RNF-04) — **control de seguridad de esta sesión**.
- Tests de modelo y persistencia.

**Criterio de cierre:** se crean y leen entidades en la BD dockerizada; campos PII cifrados; tests verdes.
**Métrica que aporta:** primer KLOC; acoplamiento inicial entre entidades.
**Documentación de cierre obligatoria** (registrar el primer snapshot real de métricas y la decisión de cifrado).

---

### Sesión 3 — Identificación y contacto (RF-01, RF-02)
**Objetivo:** primeras secciones funcionales del formulario.
- Casos de uso: registrar identificación y contacto.
- Endpoints + vistas (HTML).
- Validación de formato de cédula con regex (RN-07, resuelve DEF001) — **seguridad: saneamiento de entradas**.
- Validación de campos obligatorios (RF-08, CA-02).
- Tests unitarios y de integración.

**Criterio de cierre:** se registra un cliente con identificación y contacto válidos; rechaza datos inválidos (CA-01, CA-02).
**Métrica que aporta:** cobertura empieza a subir; primeros tests por requisito.
**Documentación de cierre obligatoria.**

---

### Sesión 4 — Perfil económico y clasificación de riesgo (RF-03, RF-06)
**Objetivo:** el módulo de mayor lógica de negocio.
- `PerfilEconomico` con `esClienteBajoRiesgo()` aplicando RN-01 (umbrales Art. 26).
- Clasificación automática y badge reactivo en tiempo real (resuelve DEF002) — listener `onChange`.
- Registro de la clasificación en `LogAuditoria` (RNF-05, CA-07).
- Tests exhaustivos de los umbrales (casos límite: $4,900 vs $5,000, etc.).

**Criterio de cierre:** clasifica correctamente todos los casos límite; badge se actualiza sin recargar (CA-05).
**Métrica que aporta:** **complejidad ciclomática** (este es el método más ramificado — medir V(G) y mantener ≤ 10); densidad de defectos del módulo.
**Documentación de cierre obligatoria** (medir y registrar la complejidad del clasificador en detalle).

---

### Sesión 5 — Folio único y checklist documental (RF-05, RF-07)
**Objetivo:** trazabilidad documental y folio.
- `FolioService.generar()` usando la `SEQUENCE` (RN-03).
- **Aplicar el ciclo de medición a DEF003:** prueba de carga con usuarios concurrentes; verificar 0 folios duplicados; documentar antes/después.
- Checklist de documentos con timestamp (CA-09); bloqueo si falta documento de identidad (RN-04, CA-08).
- Tests de concurrencia.

**Criterio de cierre:** 0 folios duplicados bajo carga concurrente; checklist funcional.
**Métrica que aporta:** **primer caso completo del proceso de medición** (Objetivo→Métrica→Recolección→Análisis→Mejora sobre DEF003).
**Documentación de cierre obligatoria** (incluir el ciclo de medición de DEF003 documentado paso a paso).

---

### Sesión 6 — Seguridad, roles, PEP y auditoría (RF-12, RNF-01, RNF-05)
**Objetivo:** sesión de seguridad concentrada (el resto es transversal).
- Autenticación + autorización por rol (Oficial / Supervisor) — RNF-01.
- Alerta y redirección PEP (RF-12, RN-02, CA-04) con mensaje específico (resuelve DEF006).
- Log de auditoría completo de accesos, creación, modificación y exportación (RNF-05).
- Cabeceras de seguridad (helmet), manejo seguro de sesiones, sin secretos hardcodeados.
- **Pruebas de seguridad** (control de acceso, intentos no autorizados).

**Criterio de cierre:** endpoints protegidos por rol; PEP redirige con mensaje claro; auditoría registra todo.
**Métrica que aporta:** **vulnerabilidades** (revisar security hotspots); tasa de defectos; cobertura de eventos auditados.
**Documentación de cierre obligatoria** (registrar hallazgos de seguridad y su resolución).

---

### Sesión 7 — Exportación PDF y búsqueda (RF-11)
**Objetivo:** funciones de salida y consulta.
- Exportación a PDF del formulario.
- Generación asíncrona de PDF para evitar timeout (resuelve DEF007).
- Búsqueda por folio y por nombre con **consultas parametrizadas** (anti-inyección, OWASP A03) e **índice** en la columna `nombre` (resuelve DEF004) — **seguridad + rendimiento**.
- Tests de exportación y búsqueda.

**Criterio de cierre:** PDF generado correctamente; búsqueda por nombre < 3s con muchos registros (RNF-02); sin inyección SQL.
**Métrica que aporta:** **debt ratio** y **code smells** consolidados; segundo y tercer caso del proceso de medición (DEF004, DEF007).
**Documentación de cierre obligatoria.**

---

### Sesión 8 — Hardening, métricas finales y diagramas
**Objetivo:** cerrar calidad y consolidar las métricas del parcial.
- Forzar HTTPS/TLS (RNF-04), revisión final de cabeceras y secretos.
- Refactors finales para reducir debt ratio y code smells a meta (rating A, debt < 5%).
- Resolver code smells y vulnerabilidades pendientes (meta: 0 críticas/altas).
- **Recolección final de todas las métricas** y consolidación de la serie de las 8 sesiones (gráfico de evolución).
- **Actualizar los diagramas** de clases y de casos de uso para reflejar el sistema real construido.
- Completar la **matriz de trazabilidad** final (Artículo → RF → Clase → Test → Defecto).
- Calcular **productividad** a partir del historial de Git y de las horas-persona registradas.

**Criterio de cierre:** todas las metas del §11 del PRD alcanzadas o justificadas; diagramas y matriz actualizados.
**Métrica que aporta:** **todas, consolidadas**, más la serie temporal de evolución.
**Documentación de cierre obligatoria** (este cierre es además el insumo principal del entregable del Parcial 2).

---

## Resumen de qué mide cada sesión

| Sesión | Foco | Métrica protagonista |
|--------|------|----------------------|
| 1 | Infraestructura | Línea base (todo en cero, medible) |
| 2 | Modelo de datos | KLOC inicial, acoplamiento |
| 3 | Identificación/contacto | Cobertura, primeros tests |
| 4 | Clasificación de riesgo | Complejidad ciclomática |
| 5 | Folio/documentos | Proceso de medición (DEF003) |
| 6 | Seguridad/roles/PEP | Vulnerabilidades, auditoría |
| 7 | PDF/búsqueda | Debt ratio, code smells |
| 8 | Hardening/cierre | Todas + evolución + diagramas |

---

## Acumulación de la documentación

Toda la documentación de cierre vive en `/docs/sesiones/` (`sesion-01.md` … `sesion-08.md`). Al terminar la Sesión 8, esa carpeta contiene la **historia completa y medible** del proyecto, lista para redactar el entregable final del Parcial 2 sin reconstruir nada de memoria.

---

*Recordatorio final: documentar al cierre de cada sesión no es opcional. Es la diferencia entre tener una serie de 8 mediciones reales y tener que inventar números al final.*
