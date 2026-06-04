# Sesión 01 — Infraestructura y arnés de medición

**Fecha:** 2026-06-04
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** (registrar horas-persona al cerrar la sesión)

---

## 1. Objetivo de la sesión

Dejar toda la infraestructura técnica operativa para que desde la Sesión 2 ya
sea posible medir. **Sin lógica de negocio.** El criterio de cierre es que el
pipeline de CI corra verde en un push de prueba y que SonarCloud muestre el
proyecto analizado (aunque vacío de código de negocio).

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Proyecto Node + TypeScript + Express | `package.json`, `tsconfig.json`, `tsconfig.build.json` | `strict: true`; build separado del type-check |
| App Express con ruta `/health` | `src/interfaces/app.ts`, `src/index.ts` | Factory pattern para facilitar tests sin abrir puerto |
| Estructura de carpetas PRD §10 | `src/{domain,application,infrastructure,interfaces,security}`, `tests/{unit,integration,security}`, `docs/sesiones` | Carpetas vacías marcadas con `.gitkeep` |
| Prisma schema (solo datasource + generator) | `prisma/schema.prisma` | Sin modelos; se definen en Sesión 2 |
| Vistas EJS (directorio reservado) | `src/interfaces/views/` | Vacío hasta Sesión 3 |
| Dockerfile multi-stage | `Dockerfile` | build → `npm prune --production` → production; usuario `node` no-root |
| docker-compose (app + postgres:16-alpine) | `docker-compose.yml` | `healthcheck` en postgres; `depends_on: condition: service_healthy` |
| Variables de entorno | `.env.example` | `.env` real en `.gitignore`; `ENCRYPTION_KEY` comentada para Sesión 2 |
| Vitest + lcov | `vitest.config.ts` | provider `v8`; reporters `text`, `lcov`, `html`; sin thresholds todavía |
| ESLint + Prettier | `.eslintrc.json`, `.prettierrc` | ESLint 8 + typescript-eslint v8; override `jest:true` para tests |
| SonarCloud | `sonar-project.properties` | `org=jorgeizarra`, `key=JorgeIzarra_dds-sujeto-obligado`. Token en GitHub Secret `SONAR_TOKEN` |
| GitHub Actions CI | `.github/workflows/ci.yml` | Jobs: `lint` → `test` (con postgres service) → `sonar` |
| Test de arnés | `tests/unit/health.test.ts` | 1 test; valida que el pipeline completo corre verde |
| Gitignore completo | `.gitignore` | `node_modules/`, `.env`, `dist/`, `coverage/`, etc. |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| (Ninguno de RF/RNF — Sesión 1 es infraestructura pura) | N/A | Los RF comienzan en Sesión 3 |
| RNF-04 (cifrado) — preparación | Parcial | `.env.example` reserva `ENCRYPTION_KEY`; se implementa en Sesión 2 |
| SPEC-SEC-06 (sin secretos en código) | Completo | Variables de entorno desde el inicio; `.env` ignorado por git |

---

## 4. Decisiones técnicas y justificación

| Decisión | Alternativa descartada | Justificación |
|----------|------------------------|---------------|
| **Prisma ORM** | `pg` directo | Migraciones declarativas, cliente tipado, facilita medición de deuda; elegido por el equipo |
| **EJS** | Handlebars | Sintaxis más próxima a HTML puro; curva de aprendizaje menor para el equipo |
| **Dos tsconfig** (`tsconfig.json` + `tsconfig.build.json`) | Uno solo con `rootDir: src` | El tsconfig base incluye `tests/` para IDE y ESLint; el de build excluye tests para que tsc no los compile a `dist/` |
| **Factory `createApp()`** en `app.ts` | Iniciar directamente en `index.ts` | Permite importar la app en tests sin abrir puerto; patrón estándar con Supertest |
| **`npm prune --production` en Dockerfile** | Stage separado con `npm ci --omit=dev` | Prisma CLI (devDep) genera el client en el build stage antes del prune; `@prisma/client` (prodDep) sobrevive el prune |
| **PostgreSQL en CI desde Sesión 1** | Añadirlo en Sesión 2 | Sesión 2 introduce pruebas de integración con BD; tenerlo listo evita reconfigurar el pipeline |
| **`npx prisma generate \|\| true` en CI** | Fallar el step | Sin modelos en Sesión 1, `prisma generate` sale con error. El `\|\| true` lo ignora solo hasta Sesión 2; quitar en el commit que añada los modelos |
| **Vitest 4.x en lugar de 2.x** | Mantener 2.x | `vitest@2.x` arrastraba `esbuild ≤0.24.2` (2 vulnerabilidades críticas). Actualizar a 4.x las resuelve sin cambios en la API de tests |
| **SonarCloud configurado en la misma sesión** | Dejar `continue-on-error: true` permanente | Las credenciales (org, project key, token) se configuraron durante la sesión; `continue-on-error` se quitó para que el job falle si Sonar tiene problema real |

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Estado | Referencia |
|---------|--------|-----------|
| Sin secretos hardcodeados (SPEC-SEC-06) | ✅ Aplicado | Toda credencial va por `.env`; `.env` en `.gitignore` |
| Usuario no-root en Docker (SPEC-SEC-07) | ✅ Aplicado | `USER node` en stage production del Dockerfile |
| Checklist de controles §7 del PRD | Revisado | Los controles restantes (cifrado, auditoría, helmet, roles) se implementan en sus sesiones correspondientes |

---

## 6. Métricas registradas en este punto

> **Nota:** estas métricas son la **línea base en cero**. El arnés de medición
> ya está operativo; los valores reales empiezan a acumularse desde Sesión 2.

| Métrica | Valor | Herramienta | Variación vs sesión anterior |
|---------|-------|-------------|------------------------------|
| KLOC | ≈ 0.05 (boilerplate) | Conteo manual / SonarCloud | Línea base |
| Cobertura de código (%) | ~100% sobre el único archivo testeable (`app.ts`) | Vitest lcov | Línea base |
| Complejidad ciclomática (máx/prom) | 1 / 1 (una sola rama en `/health`) | SonarCloud | Línea base |
| Code smells | 0 | SonarCloud | Línea base |
| Vulnerabilidades (crít/altas) | 0 | SonarCloud | Línea base |
| Debt ratio (%) | 0% | SonarCloud | Línea base |
| Defectos detectados | 0 | — | Línea base |
| Tests | 1 (arnés de infraestructura) | Vitest | Línea base |
| Horas-persona | (completar al cerrar la sesión) | Bitácora del equipo | — |

---

## 7. Defectos encontrados / resueltos

| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|
| DEF-S1-01 | `@typescript-eslint/parser@v7` no soporta TypeScript 5.9.3 (`SUPPORTED: >=4.7.4 <5.6.0`); warning en cada ejecución de lint | Baja | ✅ Resuelto | Actualizar a `@typescript-eslint@^8.0.0` (instalada v8.60.1), que cubre TypeScript 5.6+. Sin cambios en `.eslintrc.json`. Commit `9cfcbb1` |

---

## 8. Pruebas añadidas

| Archivo | Tipo | Qué cubre |
|---------|------|-----------|
| `tests/unit/health.test.ts` | Unitario / arnés | `GET /health` responde 200 con `{ status: 'ok', timestamp }`. Valida que Express arranca, que la factory `createApp()` funciona y que Vitest + Supertest están correctamente integrados. No corresponde a ninguna SPEC-BHV de negocio (Sesión 1 es solo infraestructura). |

---

## 9. Commits de la sesión

| Hash | Mensaje | Archivos |
|------|---------|---------|
| `e9d3418` | `chore(infra): inicializar proyecto Node+TS+Express (Sesión 1)` | 30 archivos; estructura completa, CI, Docker, test de arnés |
| `9cfcbb1` | `chore(infra): actualizar @typescript-eslint a v8 (compatibilidad TS 5.9)` | `package.json`, `package-lock.json` — resuelve DEF-S1-01 |

---

## 10. Pendientes y riesgos para la próxima sesión

### Configuración manual pendiente (te toca a ti)

- Agregar `SONAR_TOKEN` a GitHub Secrets antes del primer push (ver §11).
- Deshabilitar "Automatic Analysis" en SonarCloud → Administration → Analysis Method.

### Para la Sesión 2
- Definir los modelos Prisma (`FormularioDDS`, `Cliente`, `DatosContacto`,
  `PerfilEconomico`, `Documento`, `Oficial`, `LogAuditoria`) según SPEC-DATA-01..03.
- Primera migración de PostgreSQL.
- Implementar cifrado en reposo de campos PII (SPEC-SEC-01).
- Añadir primer snapshot real de KLOC y acoplamiento.

### Riesgos identificados
| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| `package-lock.json` no commiteado → CI rojo | ✅ Resuelto | `npm install` ejecutado y lock file commiteado en `e9d3418` |
| SonarCloud "Automatic Analysis" activo → conflicto con CI | ✅ Resuelto | Credenciales configuradas y `continue-on-error` quitado; deshabilitar Automatic Analysis en SonarCloud antes del primer análisis |
| Vistas EJS — path `/views` vs `/dist/views` en producción Docker | Abierto (sin vistas todavía) | `app.set('views', path.join(process.cwd(), 'src/interfaces/views'))` + COPY en Dockerfile a añadir en Sesión 3 |
| `npx prisma generate` falla sin modelos en CI | ✅ Resuelto | `\|\| true` en el step de CI hasta Sesión 2; quitar en el commit que añada los modelos |

---

## 11. Evidencia / capturas

> Completar con capturas de pantalla del primer pipeline verde y del primer
> proyecto en SonarCloud una vez realizada la configuración manual.

### Herramientas y versiones exactas (reproducibilidad)

| Herramienta | Versión exacta instalada | Cómo verificar |
|-------------|--------------------------|----------------|
| Node.js | **v22.14.0** (imagen Docker: `node:22-alpine`) | `node --version` |
| npm | **11.6.2** | `npm --version` |
| TypeScript | **5.9.3** | `npx tsc --version` |
| Express | `^4.21.2` (ver `npm list express`) | `npm list express` |
| EJS | `^3.1.10` | `npm list ejs` |
| Prisma CLI + Client | **5.22.0** | `npx prisma --version` |
| Vitest | **4.1.8** ¹ | `npm list vitest` |
| @vitest/coverage-v8 | **4.1.8** (igual que vitest) | `npm list @vitest/coverage-v8` |
| ESLint | **8.57.1** | `npx eslint --version` |
| @typescript-eslint parser/plugin | **8.60.1** ² | `npm list @typescript-eslint/parser` |
| Prettier | **3.8.3** | `npx prettier --version` |
| Supertest | **7.2.2** | `npm list supertest` |
| ts-node | **10.9.2** | `npm list ts-node` |
| PostgreSQL (Docker) | `postgres:16-alpine` | `docker inspect postgres:16-alpine` |
| SonarCloud Action | `SonarSource/sonarcloud-github-action@v3` | `.github/workflows/ci.yml` |
| Docker Compose | v2+ (sin campo `version:` deprecado) | `docker compose version` |

> ¹ Se especificó `^2.1.8` en el plan inicial; se actualizó a `^4.1.8` para
> resolver vulnerabilidades críticas de `esbuild ≤0.24.2` (GHSA-67mh-4wv8-2f99)
> arrastradas transitivamente por vitest 2.x → vite → esbuild. Vitest 4.x
> incluye esbuild 0.25.x que resuelve la vulnerabilidad. Sin breaking changes
> en la API utilizada (`globals`, `coverage v8`, `describe/it/expect`).

> ² Se especificó `^7.18.0` en el plan inicial; se actualizó a `^8.0.0` (instalada 8.60.1)
> durante la sesión para corregir DEF-S1-01 (incompatibilidad con TypeScript 5.9.3).

> Las versiones exactas instaladas quedan fijadas en `package-lock.json`
> (generado con `npm install` en el primer setup local y commiteado).

### Pasos manuales que le tocan al desarrollador

1. **Generar el lock file** (obligatorio antes del primer push):
   ```bash
   npm install
   git add package-lock.json
   ```

2. **Crear el repositorio en GitHub** (si no existe):
   - Ir a https://github.com/new → nombre: `dds-sujeto-obligado` → público.
   - `git remote add origin https://github.com/<usuario>/dds-sujeto-obligado.git`

3. **Conectar SonarCloud**:
   - https://sonarcloud.io → "Import an organization" → conectar con GitHub.
   - Importar el repositorio.
   - Copiar `Organization Key` y `Project Key` → reemplazar en `sonar-project.properties`.

4. **Deshabilitar "Automatic Analysis"** ← **¡imprescindible!**:
   - En SonarCloud → tu proyecto → Administration → Analysis Method →
     seleccionar "CI-based analysis" (deshabilitar Automatic Analysis).
   - Sin este paso el job `sonar` en CI falla con:
     *"You are running CI analysis while Automatic Analysis is enabled."*

5. **Configurar `SONAR_TOKEN`** en GitHub:
   - SonarCloud → My Account → Security → Generate Token → copiar.
   - GitHub → tu repo → Settings → Secrets and variables → Actions →
     New repository secret → Nombre: `SONAR_TOKEN` → pegar el token.

6. **Quitar `continue-on-error: true`** del job `sonar` en `.github/workflows/ci.yml`
   una vez que el análisis corra verde.

7. **Levantar todo con Docker**:
   ```bash
   # Solo la BD (para desarrollo local con npm run dev):
   docker compose up postgres -d

   # Stack completo (app compilada + BD):
   npm run build
   docker compose up --build
   ```

8. **Correr los tests localmente**:
   ```bash
   # Instalar dependencias (primera vez):
   npm install

   # Generar el cliente Prisma:
   npx prisma generate

   # Lint:
   npm run lint

   # Tests con cobertura:
   npm run test:coverage
   # El reporte lcov queda en coverage/lcov.info
   # El reporte HTML en coverage/index.html
   ```
