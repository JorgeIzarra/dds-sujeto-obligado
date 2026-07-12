# PRD — Sistema de Debida Diligencia Simplificada (DDS)

**Proyecto:** Sistema web de Debida Diligencia Simplificada para Sujeto Obligado No Financiero (SSNF)
**Asignatura:** Ingeniería de Software Aplicada IV — Parcial 2, Unidad 2
**Integrantes:** Julio C. Gudiño K., Amir Reyes, Héctor Ortega
**Marco legal:** Ley 23 del 27 de abril de 2015 · Ley 254 de 2021 · Acuerdos SSNF
**Estado:** Línea base para implementación (Parcial 2)

---

## 1. Visión del producto

Construir un sistema web funcional que permita a un Sujeto Obligado No Financiero (SSNF) recabar, validar, clasificar y conservar la información mínima necesaria para aplicar **Debida Diligencia Simplificada** a clientes de **bajo riesgo**, en conformidad con la Ley 23 de 2015.

A diferencia del Parcial 1 (diseño y pruebas simuladas), este PRD define un producto **realmente programable y medible**, cuyo propósito secundario —pero igual de importante para la nota— es servir de base para la recolección de métricas de software exigidas en el Parcial 2 (requerimientos, diseño, código, métricas clásicas y proceso de medición).

> **Principio rector:** el sistema maneja datos personales (PII) y datos de prevención de blanqueo de capitales (AML). Por tanto, **la seguridad no es un módulo aparte: es un requisito legal transversal** que atraviesa cada función, cada entidad y cada sesión de desarrollo. Ver §7.

---

## 2. Objetivos del producto

| ID | Objetivo | Indicador de éxito |
|----|----------|--------------------|
| OBJ-01 | Registrar y perfilar clientes de bajo riesgo conforme a la Ley 23/2015 | Formulario completo guardado con clasificación automática |
| OBJ-02 | Garantizar la confidencialidad e integridad de los datos del cliente | 0 vulnerabilidades críticas en SonarQube; cifrado en reposo y tránsito |
| OBJ-03 | Asegurar la trazabilidad y retención documental por 5 años | Folio único irrepetible + log de auditoría completo |
| OBJ-04 | Excluir automáticamente perfiles que no califican (PEP, umbrales superados) | Redirección a diligencia reforzada cuando aplica |
| OBJ-05 | Producir un código base medible para las métricas del Parcial 2 | Métricas recolectadas y documentadas por sesión |

---

## 3. Alcance

### Dentro de alcance
- Formulario DDS completo (identificación, contacto, perfil económico, propósito, documentos, clasificación, firma).
- Clasificación automática de riesgo según umbrales de la Ley 23/2015.
- Generación de folio único e irrepetible.
- Validaciones de campos y reglas de negocio.
- Registro de log de auditoría de accesos y cambios.
- Control de acceso por rol.
- Exportación del formulario a PDF.
- Búsqueda de formularios por folio y por nombre.
- Persistencia con retención calculada a 5 años.
- Interfaz web server-rendered (EJS) con estética de software empresarial.

### Fuera de alcance (para este parcial)
- Módulo completo de Diligencia Reforzada (solo se implementa la **redirección/alerta**).
- Integración con listas externas reales (PEP, OFAC, etc.) — se simula con un campo declarativo.
- Firma electrónica certificada legalmente (se captura firma simple/dibujada).
- Despliegue en producción real (solo entorno dockerizado local/CI).

---

## 4. Actores

| Actor | Descripción | Permisos |
|-------|-------------|----------|
| **Cliente** | Persona natural o jurídica que provee su información | Solo aporta datos (no accede al sistema directamente) |
| **Oficial de Cumplimiento** | Funcionario del SSNF que registra, verifica y clasifica | Crear, verificar, clasificar, exportar |
| **Supervisor de Cumplimiento** | Rol con mayor autoridad | Todo lo del Oficial + autorizar ediciones de formularios aprobados |

---

## 5. Requisitos funcionales

Heredan la numeración del Parcial 1 para mantener trazabilidad directa. Cada RF se enlazará a su clase, módulo de código y caso de prueba en la matriz de trazabilidad (§12).

| ID | Requisito | Descripción | Prioridad | Base legal |
|----|-----------|-------------|-----------|------------|
| RF-01 | Registro de identificación | Nombre, tipo y número de documento, fecha de nacimiento, nacionalidad, tipo de cliente | Alta | Art. 24 |
| RF-02 | Registro de datos de contacto | Dirección, teléfono, correo electrónico | Alta | Art. 24, Acuerdos SSNF |
| RF-03 | Registro del perfil económico | Actividad, fuente de ingresos, ingreso mensual estimado | Alta | Art. 25 |
| RF-04 | Declaración del propósito | Propósito de la relación comercial y volumen estimado de transacciones | Alta | Art. 25 |
| RF-05 | Checklist de documentos | Registro de documentos presentados con timestamp | Alta | Art. 24-25 |
| RF-06 | Clasificación automática de riesgo | Clasificar como "Bajo Riesgo" según criterios del Art. 26 | Alta | Art. 26 |
| RF-07 | Generación de folio único | Folio irrepetible automático por formulario | Alta | Art. 55 |
| RF-08 | Validación de campos obligatorios | Impedir guardado con campos obligatorios vacíos | Alta | Art. 24 |
| RF-09 | Registro de firma | Captura de firma del cliente y del oficial | Media | Art. 24 |
| RF-10 | Almacenamiento por 5 años | Conservar formularios mínimo 5 años desde el cierre | Alta | Art. 55 |
| RF-11 | Exportación en PDF | Exportar el formulario a PDF para archivo | Media | — |
| RF-12 | Alerta de cliente PEP | Redirigir a Diligencia Reforzada cuando el cliente es PEP | Alta | Art. 26 |

---

## 6. Requisitos no funcionales

| ID | Categoría | Descripción | Métrica objetivo | Prioridad |
|----|-----------|-------------|------------------|-----------|
| RNF-01 | Confidencialidad | Datos accesibles solo por personal autorizado | Acceso por rol verificado | Alta |
| RNF-02 | Rendimiento | Guardar o consultar un formulario | ≤ 3 segundos | Alta |
| RNF-03 | Disponibilidad | Disponible en horario laboral | 99.5% uptime/mes | Alta |
| RNF-04 | Seguridad de datos | Cifrado en reposo y en tránsito | AES-256 + TLS 1.2+ | Alta |
| RNF-05 | Trazabilidad | Log de auditoría de accesos y modificaciones | Log completo | Alta |
| RNF-06 | Usabilidad | Completar el formulario sin formación técnica | ≤ 10 minutos | Media |
| RNF-07 | Compatibilidad | Chrome, Firefox y Edge actuales | 3 navegadores | Media |
| RNF-08 | Retención documental | Conservación por mínimo 5 años | 5 años | Alta |
| RNF-09 | Accesibilidad | Cumplir WCAG 2.1 Nivel AA | Nivel AA | Media |
| RNF-10 | Escalabilidad | Registros simultáneos sin degradación | 50 usuarios concurrentes | Baja |

---

## 7. Seguridad legal (eje transversal)

Esta sección es el corazón del enfoque. Mapea cada exigencia de la Ley 23/2015 a un control técnico concreto y a la métrica que lo verifica. **Ningún control de esta tabla es opcional ni se difiere al final**: cada uno se implementa y se mide dentro de la sesión donde se construye la función relacionada.

| Fundamento legal | Requisito asociado | Control de seguridad | Métrica que lo verifica | Sesión |
|------------------|--------------------|--------------------|-----------------------|--------|
| Art. 55 — retención 5 años | RF-10, RNF-08 | Cifrado en reposo (AES-256) de campos PII | Vulnerabilidad "datos sensibles sin cifrar" = 0 (SonarQube) | 2, 8 |
| RNF-01 — acceso autorizado | RF-01..RF-12 | Autenticación + autorización por rol | Security hotspots de control de acceso revisados | 6 |
| RNF-04 — transporte seguro | RNF-04 | TLS 1.2+ / HTTPS forzado | Hotspot de transporte inseguro = 0 | 8 |
| RNF-05 — auditoría | RF (todos) | Log de auditoría de accesos y cambios | Cobertura de eventos auditados ≥ 90% | 6 |
| DEF004 — búsqueda por nombre | RF (búsqueda) | Consultas parametrizadas (anti-inyección) | Vulnerabilidad de inyección SQL (OWASP A03) = 0 | 7 |
| Art. 26 — exclusión PEP | RF-06, RF-12 | Validación estricta de regla de negocio | Densidad de defectos del módulo de clasificación | 4, 5 |
| Ley 254/2021 — beneficiario final | RF-05 | Manejo controlado de datos de terceros | Fuga de datos / exposición de PII = 0 | 6 |
| Art. 24 — declaración jurada | RF-09 | Integridad de la firma y de los datos | Validación de integridad en pruebas | 6 |

### Controles de seguridad obligatorios (checklist permanente)
- [ ] Validación y saneamiento de **todas** las entradas del usuario.
- [ ] Consultas a BD **siempre** parametrizadas (nunca concatenación de strings).
- [ ] Cifrado de campos sensibles en reposo y TLS en tránsito.
- [ ] Control de acceso por rol en cada endpoint.
- [ ] Sin secretos ni credenciales hardcodeadas (uso de variables de entorno).
- [ ] Log de auditoría en cada acceso, creación, modificación y exportación.
- [ ] Cabeceras de seguridad HTTP (helmet) y manejo seguro de sesiones.
- [ ] Mensajes de error que no filtren información interna (corrige DEF006).

---

## 8. Modelo de datos

Basado en el diagrama de clases del Parcial 1. Cada entidad mantiene su responsabilidad.

| Entidad | Atributos clave | Responsabilidad |
|---------|-----------------|-----------------|
| `FormularioDDS` | folio, fecha, propósito, clasificacionRiesgo, estado, fechaExpiracion | Agregado raíz; agrupa toda la información |
| `Cliente` | nombre, tipoDocumento, numDocumento, fechaNacimiento, nacionalidad, tipoCliente, esPEP | Identificación del cliente |
| `DatosContacto` | direccion, telefono, correo, fechaVerif | Información de contacto |
| `PerfilEconomico` | actividad, fuenteIngresos, ingresoMensual, volumenTransacciones | Datos para clasificación; método `esClienteBajoRiesgo()` |
| `Documento` | tipo, fechaRecepcion, verificado, baseLegal | Cada documento presentado |
| `Oficial` | nombre, cargo, firma | Funcionario responsable; método `aprobarFormulario()` |
| `LogAuditoria` *(nuevo)* | timestamp, usuario, accion, entidadAfectada | Trazabilidad (RNF-05); no existía explícito en Parcial 1 |

> **Nota de volatilidad de requisitos:** `LogAuditoria` y la `fechaExpiracion` calculada son entidades/atributos que emergen al implementar; se registran como cambios respecto a la línea base del Parcial 1 (alimenta la métrica de volatilidad).

---

## 9. Reglas de negocio

| ID | Regla | Detalle |
|----|-------|---------|
| RN-01 | Clasificación de bajo riesgo | Cliente es "Bajo Riesgo" si: ingreso mensual ≤ $5,000 **Y** volumen de transacciones ≤ $10,000/mes **Y** `esPEP = false` |
| RN-02 | Exclusión por PEP | Si `esPEP = true`, el formulario **no** puede guardarse como DDS; alerta + redirección a reforzada (RF-12) |
| RN-03 | Folio único | Formato `DDS-AAAA-NNNNNN`; irrepetible incluso bajo concurrencia (resuelve DEF003 con `SEQUENCE` + `UNIQUE`) |
| RN-04 | Documento mínimo | No se permite guardar si el documento de identidad no está marcado como presentado |
| RN-05 | Retención | `fechaExpiracion = fechaCierre + 5 años` (Art. 55) |
| RN-06 | Inmutabilidad post-aprobación | Un formulario aprobado solo se edita con autorización de Supervisor |
| RN-07 | Formato de cédula panameña | Validación con expresión regular (resuelve DEF001) |

---

## 10. Arquitectura técnica

### Stack
- **Backend:** Node.js + TypeScript + Express
- **Base de datos:** PostgreSQL (con `SEQUENCE` + `UNIQUE` para folio, índices para búsqueda)
- **Cliente de BD:** Prisma (o `pg` directo)
- **Frontend:** Express server-rendered con EJS + JS de cliente vanilla (sin SPA/React); sesión dedicada (S8). La resolución del path de vistas en Docker es parte del alcance de S8. RNF-06 (usabilidad ≤ 10 min), RNF-07 (compatibilidad de navegadores) y RNF-09 (accesibilidad WCAG 2.1 AA) se verifican en S8.
- **Pruebas:** Vitest + Supertest; cobertura en formato lcov
- **Calidad/métricas:** SonarQube (o SonarCloud) + ESLint + Prettier
- **Infraestructura:** Docker + docker-compose (app + PostgreSQL)
- **CI:** GitHub Actions (tests + análisis en cada push)
- **Control de versiones:** Git desde el commit inicial

### Estructura de carpetas propuesta
```
/src
  /domain        (entidades y reglas de negocio: clasificación, validaciones)
  /application   (casos de uso: registrar, clasificar, exportar)
  /infrastructure(persistencia, BD, cifrado, PDF)
  /interfaces    (rutas Express, controladores, vistas)
  /security      (auth, roles, auditoría, saneamiento)
/tests           (unitarias, integración, seguridad)
/docs
  /sesiones      (documentación de cierre por sesión — ver PLAN_SESIONES.md)
docker-compose.yml
Dockerfile
sonar-project.properties
```

### Principio de diseño para controlar métricas
- Mantener la lógica de decisión (clasificación, validaciones) en `/domain` con métodos pequeños → **complejidad ciclomática baja** (meta V(G) ≤ 10).
- Evitar que `FormularioDDS` se convierta en "God class": delegar a `PerfilEconomico`, `DatosContacto`, etc. → **acoplamiento controlado**.
- Un solo lenguaje (TS) en backend → métricas coherentes de KLOC y debt ratio.

---

## 11. Métricas objetivo (Parcial 2)

| Bloque | Métrica | Meta |
|--------|---------|------|
| Requerimientos | Cobertura de requisitos | 100% de RF con al menos un test |
| Requerimientos | Cobertura de código | ≥ 80% en lógica de negocio |
| Requerimientos | Volatilidad | Documentada respecto a línea base Parcial 1 |
| Diseño | Complejidad ciclomática | V(G) ≤ 10 por método |
| Diseño | Acoplamiento (CBO) / Cohesión (LCOM) | Controlados; sin God class |
| Código | Densidad de defectos | Medida sobre KLOC real |
| Código | Code smells | Rating A en SonarQube |
| Código | Vulnerabilidades | 0 críticas/altas |
| Clásicas | Debt ratio | < 5% |
| Clásicas | KLOC | Medido y registrado por sesión |
| Clásicas | Productividad | LOC o puntos de función por hora-persona (de Git) |
| Clásicas | Tasa de defectos | Por fase/sesión |
| Proceso | Ciclo Objetivo→Métrica→Recolección→Análisis→Mejora | Aplicado a ≥ 3 casos (DEF003, DEF004, clasificación) |

---

## 12. Trazabilidad

Se mantendrá una matriz bidireccional viva (en `/docs`):

```
Artículo de Ley → Requisito (RF/RNF) → Clase/Módulo → Caso de prueba → Defecto
```

Ejemplo de fila:
```
Art. 55 → RF-10/RNF-08 → FormularioDDS.calcularExpiracion() → test_retencion_5_anios → DEF (n/a)
Art. 26 → RF-06       → PerfilEconomico.esClienteBajoRiesgo() → test_clasificacion_* → DEF002
DEF003  → RF-07       → FolioService.generar()               → test_folio_concurrencia → (resuelto)
```

---

## 13. Criterios de aceptación (heredados y ampliados)

| ID | Criterio | Resultado esperado |
|----|----------|--------------------|
| CA-01 | Validar formato de cédula (X-XXX-XXXX) | Bloqueo + mensaje de error si no coincide |
| CA-02 | Rechazar campos obligatorios vacíos | Resaltado + mensaje descriptivo |
| CA-03 | Asignar folio único `DDS-AAAA-NNNNNN` | No se repite ni bajo concurrencia |
| CA-04 | Detectar PEP y redirigir | Modal de advertencia; no guarda como DDS |
| CA-05 | Clasificar "Bajo Riesgo" según umbrales | Badge verde automático |
| CA-06 | Bloquear clasificación si hay factor elevado | Alerta + redirección |
| CA-07 | Registrar clasificación en auditoría | Log con fecha, hora, usuario, resultado |
| CA-08 | Verificar documento de identidad presente | Bloqueo si no está verificado |
| CA-09 | Timestamp por documento recibido | Visible en historial |
| CA-SEC | Toda entrada saneada y consulta parametrizada | 0 vulnerabilidades de inyección |

---

## 14. Riesgos y supuestos

| Riesgo | Mitigación |
|--------|------------|
| Tratar la seguridad como módulo final | Controles de §7 distribuidos en cada sesión |
| Métricas no recolectadas a tiempo | Setup de medición en Sesión 1; documentación obligatoria por sesión |
| God class en `FormularioDDS` | Diseño por capas y delegación a entidades |
| Folio duplicado bajo carga | `SEQUENCE` + `UNIQUE` desde el diseño de BD |
| Pérdida del historial de productividad | Git y commits frecuentes desde el inicio |

---

*Documento de uso académico. Basado en el Parcial 1 — Unidad I del mismo equipo. Toda referencia legal proviene de la Ley 23 de 2015, la Ley 254 de 2021 y los Acuerdos de la SSNF, según citados en la entrega del Parcial 1.*
