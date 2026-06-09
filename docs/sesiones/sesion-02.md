# Sesión 02 — Modelo de datos y persistencia

**Fecha:** 2026-06-07
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** (registrar horas-persona al cerrar la sesión)

---

## 1. Objetivo de la sesión

Implementar el modelo de datos completo del sistema DDS con persistencia en PostgreSQL:
- 7 entidades del dominio (SPEC-DATA-01..03)
- Migraciones de PostgreSQL con SEQUENCE para folio único
- Cifrado en reposo de campos PII (SPEC-SEC-01)
- Tests de modelo y persistencia

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Schema Prisma con 7 modelos | `prisma/schema.prisma` | FormularioDDS, Cliente, DatosContacto, PerfilEconomico, Documento, Oficial, LogAuditoria |
| Migración SQL con SEQUENCE | `prisma/migrations/20260611000000_init/migration.sql` | `CREATE SEQUENCE seq_folio_dds` + tablas + FK + índices |
| Entidades de dominio | `src/domain/entities/*.ts` (7 archivos) | Clases puras sin dependencias de infraestructura |
| EncryptionService | `src/infrastructure/security/EncryptionService.ts` | AES-256-GCM con IV aleatorio y auth tag |
| Prisma client singleton | `src/infrastructure/persistence/prisma-client.ts` | Lazy singleton |
| Repositorios | `src/infrastructure/persistence/repositories/*.ts` (7 repos) | CRUD; ClienteRepository con cifrado automático |
| Tests unitarios | `tests/unit/infrastructure/encryption.test.ts` | 7 tests de EncryptionService |
| Tests de integración | `tests/integration/persistence/{setup,formulario,cliente}.test.ts` | CRUD + verificación de cifrado en BD |
| CI actualizado | `.github/workflows/ci.yml` | Quitado `|| true`; añadido migrate + ENCRYPTION_KEY |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-07 (Folio único) — preparación | Parcial | SEQUENCE + UNIQUE en BD; generación se implementa en Sesión 5 |
| RF-10 (Retención 5 años) — preparación | Parcial | Campo `fecha_expiracion` en esquema; cálculo en Sesión 4 |
| RNF-04 (Cifrado en reposo) | Completo | SPEC-SEC-01 implementado con AES-256-GCM |
| RNF-05 (Auditoría) — preparación | Parcial | Tabla `log_auditoria` creada; escritura se implementa en Sesión 6 |
| SPEC-DATA-01 | Completo | Secuencia + tabla formulario_dds |
| SPEC-DATA-02 | Completo | Tabla cliente con índices |
| SPEC-DATA-03 | Completo | Tablas contacto, perfil, documento, oficial, auditoría |
| SPEC-SEC-01 | Completo | Cifrado AES-256-GCM de campos PII |

---

## 4. Decisiones técnicas y justificación

| Decisión | Alternativa descartada | Justificación |
|----------|------------------------|---------------|
| **Prisma ORM con migraciones** | SQL directo / Knex | Migraciones declarativas, cliente tipado, facilita medición de deuda; ya elegido en Sesión 1 |
| **AES-256-GCM para cifrado** | AES-256-CBC | GCM proporciona autenticación integrada (AEAD); más seguro contra ataques de manipulación |
| **Cifrado a nivel de aplicación** | Cifrado a nivel de BD (pgcrypto) | Control total sobre las claves; portable entre proveedores de BD; cumple SPEC-SEC-01 |
| **Clave de cifrado en variable de entorno** | Hardcodear / archivo de configuración | Cumple SPEC-SEC-06 (sin secretos en código); ya preparado en Sesión 1 |
| **UUID como primary key** | SERIAL / BIGSERIAL | Mejor para distribución; no revela cantidad de registros; estándar en APIs REST |
| **Índice en `cliente.nombre`** | Sin índice | Prepara solución de DEF004 (búsqueda lenta por nombre); se usa en Sesión 7 |
| **Relaciones con ON DELETE CASCADE** | ON DELETE SET NULL | Integridad referencial estricta; si se elimina un formulario, se eliminan sus datos relacionados |
| **`fecha_expiracion` calculada al cerrar** | Trigger en BD | Lógica de negocio en dominio (RN-05); más testeable |
| **Tests de integración con BD real en Docker** | Mock de BD | Valida que las migraciones funcionan; detecta problemas de schema temprano |
| **Singleton de PrismaClient** | Instancia nueva en cada repositorio | Evita múltiples conexiones a BD |

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Estado | Referencia |
|---------|--------|-----------|
| Cifrado en reposo de PII (Art. 55) | ✅ Aplicado | `nombre` y `num_documento` cifrados con AES-256-GCM |
| Clave de cifrado por variable de entorno | ✅ Aplicado | `ENCRYPTION_KEY` en `.env`; `.env` en `.gitignore` |
| Sin secretos hardcodeados (SPEC-SEC-06) | ✅ Aplicado | Revisado: ninguna clave en código |
| Índice para búsqueda segura (preparación DEF004) | ✅ Aplicado | `idx_cliente_nombre` creado |
| Auditoría — tabla creada (RNF-05) | Parcial | Estructura lista; escritura en Sesión 6 |

---

## 6. Métricas registradas en este punto

| Métrica | Valor | Herramienta | Variación vs sesión anterior |
|---------|-------|-------------|------------------------------|
| KLOC | (medir) | SonarCloud / conteo | ↑ desde ~0.05 |
| Cobertura de código (%) | (medir) | Vitest lcov | ↑ desde ~100% (solo arnés) |
| Complejidad ciclomática (máx/prom) | (medir) | SonarCloud | Esperado: bajo (entidades simples) |
| Code smells | (medir) | SonarCloud | Esperado: 0-2 |
| Vulnerabilidades (crít/altas) | (medir) | SonarCloud | Esperado: 0 |
| Debt ratio (%) | (medir) | SonarCloud | Esperado: < 2% |
| Defectos detectados | 0 | tests | — |
| Tests | ~12 | Vitest | ↑ desde 1 (arnés) |
| Horas-persona | (completar) | Bitácora | — |

**Métricas específicas de esta sesión:**

| Métrica | Valor |
|---------|-------|
| Número de entidades | 7 |
| Número de migraciones | 1 |
| Campos PII cifrados | 2 (nombre, num_documento) |
| Algoritmo de cifrado | AES-256-GCM |

---

## 7. Defectos encontrados / resueltos

| ID | Descripción | Severidad | Estado | Acción |
|----|-------------|-----------|--------|--------|
| — | Ningún defecto registrado | — | — | — |

---

## 8. Pruebas añadidas

### Unitarias (7 tests)

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `tests/unit/infrastructure/encryption.test.ts` | 7 | Cifrado/descifrado, IV aleatorio, clave inválida, formato inválido, strings vacíos/largos, caracteres especiales |

### Integración (6+ tests)

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `tests/integration/persistence/formulario.test.ts` | 4 | CRUD de FormularioDDS, búsqueda por folio, actualización de estado |
| `tests/integration/persistence/cliente.test.ts` | 4 | CRUD de Cliente con cifrado automático, verificación de cifrado en BD (SPEC-SEC-01) |

---

## 9. Commits de la sesión

| Hash | Mensaje | Archivos |
|------|---------|---------|
| (único commit) | `feat(data): implementar modelo de datos y cifrado en reposo (SPEC-DATA-01..03, SPEC-SEC-01)` | ~22 archivos |

---

## 10. Pendientes y riesgos para la próxima sesión

### Para la Sesión 3
- Implementar casos de uso de identificación y contacto (RF-01, RF-02)
- Endpoints REST (SPEC-API-03, SPEC-API-04)
- Validación de cédula panameña (SPEC-RN-02, DEF001)
- Vistas EJS para formularios

### Riesgos identificados
| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Vistas EJS — path `/views` vs `/dist/views` en producción Docker | Abierto | `app.set('views', path.join(process.cwd(), 'src/interfaces/views'))` + COPY en Dockerfile a añadir en Sesión 3 |

---

## 11. Evidencia / capturas

> Completar con capturas de pantalla al ejecutar los tests localmente.

### Herramientas y versiones

| Herramienta | Versión | Notas |
|-------------|---------|-------|
| Node.js | v22.14.0 | — |
| Prisma | 5.22.0 | — |
| @prisma/client | 5.22.0 | Generado automáticamente |
| Node crypto | Built-in | AES-256-GCM |
| Vitest | 4.1.8 | — |

---

*Documento de cierre de la Sesión 2. Completar métricas numéricas después de ejecutar tests y análisis de SonarCloud.*
