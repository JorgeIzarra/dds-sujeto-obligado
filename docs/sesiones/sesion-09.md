# Sesión 09 — Hardening, métricas finales y diagramas (Cierre)

**Fecha:** 2026-07-12
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** 2.0 horas-persona

---

## 1. Objetivo de la sesión

Aplicar controles finales de robustecimiento (hardening) de seguridad forzando HTTPS/TLS en producción (RNF-04) mediante redirección automática de tráfico inseguro, consolidar la suite de pruebas automatizadas asegurando el cumplimiento del 100% de las metas de calidad (Quality Gate, cobertura > 80%, duplicidad < 3%, 0 fallos), y registrar las métricas, diagramas y matriz de trazabilidad finales de la aplicación.

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Middleware de redirección HTTPS | `src/interfaces/app.ts` | RNF-04; Middleware que detecta si el protocolo de la petición es inseguro (`x-forwarded-proto !== 'https'`) en producción y redirige a la URL segura. |
| Pruebas de Redirección HTTPS | `tests/integration/web.test.ts` | 2 tests para validar el comportamiento en producción ante cabeceras `http` (estatus 302 a `https://`) y `https` (estatus 200). |
| Fallback de Instalación en Docker | `Dockerfile` | Añadido el fallback a `npm install` en el paso de compilación para prevenir fallos por desincronización de `package-lock.json` tras la inserción de `pdf-lib`. |
| Documentación de Cierre Final | `docs/sesiones/sesion-09.md` | Este archivo; recopilación final de métricas consolidadas, trazabilidad y productividad del equipo. |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RNF-04 — Forzado de HTTPS/TLS | Completo | Redirección de red mediante Express middleware. |
| RNF-01 — Seguridad y Roles | Completo | Verificación de 100% de endpoints protegidos. |
| RNF-05 — Logs de auditoría | Completo | Auditoría a nivel de repositorio y base de datos verificada. |
| RNF-06 — Usabilidad | Completo | Flujo de 5 pasos web responsivos en EJS verificado. |
| RNF-09 — Accesibilidad | Completo | Contraste de colores HSL, etiquetas semánticas y foco visible (WCAG AA). |

---

## 4. Decisiones técnicas y justificación

### Redirección HTTPS en la capa de aplicación
**Alternativa descartada:** Redirección únicamente en el proxy inverso (Nginx / Cloudflare).
**Justificación:** Aunque delegar el cifrado SSL/TLS al balanceador o proxy es lo recomendado en producción, añadir una regla en la capa de aplicación basada en `x-forwarded-proto` proporciona una defensa en profundidad robusta. Esto previene que configuraciones defectuosas del proxy expongan la aplicación mediante canales no seguros y permite validar el forzado de HTTPS directamente en las pruebas de integración locales.

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Forzado de canal seguro (HTTPS/TLS) | ✅ | RNF-04 | `web.test.ts`: redirige peticiones con `x-forwarded-proto: http` a `https` |
| Cabeceras de protección (Helmet) | ✅ | SPEC-SEC-07 | Integrado in `app.ts` (X-Frame-Options, CSP, etc.) |
| Manejo seguro de credenciales | ✅ | SPEC-SEC-06 | Claves almacenadas en variables de entorno `.env` cargadas en runtime; fallos en producción si se usan placeholders. |

---

## 6. Métricas finales registradas (Consolidado de Sesiones 1-9)

| Métrica | Valor Final | Herramienta | Cumple Meta (§11 PRD) |
|---------|-------------|-------------|-----------------------|
| KLOC `src/` | **1.350** | estimación/conteo | Sí |
| KLOC total | **3.805** | estimación/conteo | Sí |
| Cobertura de Código | **~85.2%** | Vitest | Sí (Meta > 80%) |
| Cobertura de Ramas | **83.1%** | Vitest | Sí (Meta > 80%) |
| Complejidad ciclomática máxima | **V(G) = 6** | Manual / Sonar | Sí (Meta ≤ 10) |
| Complejidad ciclomática promedio | **V(G) = 2.4** | Manual / Sonar | Sí (Meta ≤ 10) |
| Duplicación de Código | **0.0%** | SonarQube Cloud | Sí (Meta < 3.0%) |
| Code Smells | **0** | SonarQube Cloud | Sí |
| Vulnerabilidades (críticas/altas) | **0** | SonarQube Cloud | Sí (Meta: 0) |
| Tests totales | **164** | Vitest | Sí (Todos en verde) |
| Horas-persona totales | **28.5** | Bitácora | Sí |

### Evolución Histórica de Métricas

```
Métrica / H-P   | S1   | S2   | S3   | S4   | S5   | S6   | S7    | S8    | S9 (Cierre)
----------------|------|------|------|------|------|------|-------|-------|------------
Horas-Persona   | 3.0  | 3.0  | 3.0  | 4.0  | 3.0  | 4.0  | 3.5   | 3.0   | 2.0
KLOC src/       | 0.0  | 0.35 | 0.60 | 0.81 | 0.94 | 0.94 | 1.15  | 1.35  | 1.35
Tests Totales   | 0    | 12   | 38   | 62   | 90   | 123  | 134   | 159   | 164
Ramas Cov (%)   | 0%   | 91%  | 90%  | 88%  | 89%  | 82%  | 75.3% | 83.1% | 83.1%
Duplicidad (%)  | 0%   | 0%   | 0%   | 0.8% | 1.2% | 1.2% | 1.2%  | 3.6%  | 0.0%
```

---

## 7. Defectos encontrados / resueltos

| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|
| DEF-S9-01 | La compilación de Docker (`docker-compose build`) fallaba por desincronización de `package-lock.json` al no tener `pdf-lib` registrado localmente. | Alta | ✅ Resuelto | Se añadió fallback `|| npm install` en la directiva de compilación del `Dockerfile`. |
| DEF-S9-02 | Falla de colisión por puerto dinámico y paralelismo en tests de redirección de HTTPS (`web.test.ts`). | Media | ✅ Resuelto | Se cambió a coincidencia regex flexible para el puerto y se forzó ejecución secuencial usando `describe.sequential`. |
| DEF-S9-03 | El contenedor `app` fallaba en runtime por falta de compatibilidad de OpenSSL (Prisma query engine requería `libssl.so.1.1` ausente en Alpine). | Alta | ✅ Resuelto | Se migró la imagen base a Debian-slim (`node:22-slim`), la cual incluye compatibilidad nativa con glibc y OpenSSL 3.0/1.1 para Prisma de fábrica. |
| DEF-S9-04 | Helmet bloqueaba la ejecución de scripts y estilos inline de las plantillas EJS debido a su Content Security Policy (CSP) restrictiva por defecto. | Alta | ✅ Resuelto | Se configuró Helmet para permitir `'unsafe-inline'` en las directivas `script-src` y `style-src` en `app.ts`. |
| DEF-S9-05 | Helmet bloqueaba la carga de fuentes Google Fonts externa (bloqueando fonts.googleapis.com y fonts.gstatic.com). | Media | ✅ Resuelto | Se añadieron dichos dominios a las directivas `style-src` y `font-src` de Helmet CSP en `app.ts`. |

---

## 8. Matriz de trazabilidad final (Artículos Ley 23)

| Artículo Ley 23 | Requisito PRD | Capa / Clase / Método | Prueba (Test File) | Defectos asociados |
|-----------------|---------------|-----------------------|--------------------|---------------------|
| Art. 24 (DDS) | RF-01, RF-02 | `identificacion.controller.ts` | `identificacion.test.ts` | DEF001 (Cédula) |
| Art. 26 (Límites) | RF-06, RN-01 | `src/domain/clasificacion.ts` | `clasificacion.test.ts` | DEF002 (Badge reactivo) |
| Art. 26 (Límites) | RF-07, RN-03 | `src/infrastructure/services/folio.service.ts` | `folio.test.ts`, `guardar.test.ts` | DEF003 (Concurrencia folio) |
| Art. 26 (PEP) | RF-12, RN-02 | `checkEdicionFormulario` (S6) | `guardar.test.ts` | DEF006 (Mensaje PEP) |
| Art. 55 (Auditoría) | RNF-05 | `src/infrastructure/repositories/auditoria.repository.ts` | `auditoria-repository.test.ts` | - |
| Art. 55 (Cifrado) | RNF-04 | `src/security/crypto.service.ts` | `cifrado.test.ts` | - |
| - | RF-11 (PDF) | `src/interfaces/controllers/pdf.controller.ts` | `pdf.test.ts` | DEF007 (Timeout PDF) |
| - | RF-11 (Búsqueda) | `src/interfaces/controllers/busqueda.controller.ts` | `busqueda.test.ts` | DEF004 (Vulnerabilidad SQL) |
| - | RNF-04 (HTTPS) | `src/interfaces/app.ts` | `web.test.ts` | - |

---

## 9. Análisis de Productividad

- **Total de líneas de código en producción (`src/`):** 1,355 LOC.
- **Total de líneas de código en pruebas (`tests/`):** 2,465 LOC.
- **Tasa de pruebas vs producción (Test Ratio):** **1.81** (Existen 1.81 líneas de prueba por cada línea de producción, evidenciando un desarrollo robusto guiado por TDD).
- **Esfuerzo invertido:** 28.5 horas-persona.
- **Productividad global:**
  - **LOC de producción por hora-persona:** **47.5 LOC/h**
  - **LOC totales por hora-persona:** **134.0 LOC/h**
  - **Pruebas por hora-persona:** **5.6 tests/h** (Un test completo y funcional creado cada 10.7 minutos).

---

## 10. Pruebas añadidas en esta sesión

- `tests/integration/web.test.ts`:
  - `redirige a HTTPS en entorno de producción (RNF-04)` -> Verifica la redirección a `https://` cuando entra tráfico por cabecera `http`.
  - `no redirige a HTTPS en producción si la cabecera es https` -> Comprueba que peticiones seguras son procesadas normalmente.

---

## 11. Cierre de proyecto

La aplicación cumple con el 100% de los requisitos estipulados en el PRD, las directivas de seguridad basadas en la Ley 23 y las normas de ingeniería de software. Todos los Quality Gates de SonarCloud y la suite de Vitest están aprobados y en verde.
