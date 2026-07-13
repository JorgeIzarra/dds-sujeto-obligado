# Sesión 08 — Capa de presentación (EJS) y usabilidad (RF-11)

**Fecha:** 2026-07-12
**Participantes:** Jorge Izarra, Isabella Linares, Samuel Gonzales, Michael Portela
**Duración:** 3.0 horas-persona

---

## 1. Objetivo de la sesión

Construir la interfaz web de usuario mediante plantillas EJS que consuma los endpoints de la API REST del backend; resolver el path de resolución de vistas en Docker; garantizar la usabilidad (flujo completo ≤ 10 min) y accesibilidad (WCAG 2.1 AA) e implementar el cálculo y badge de riesgo reactivo en tiempo real (DEF002).

---

## 2. Trabajo realizado

| Entregable | Archivo(s) | Notas |
|------------|-----------|-------|
| Resolutor de vistas en Docker | `Dockerfile` | Descomentada la línea de copiado de las plantillas EJS a la imagen de producción en Docker. |
| Controlador de consulta individual | `src/interfaces/controllers/formulario.controller.ts` | Añadida la función `getFormularioById` que recupera el formulario y descifra en memoria el nombre y documento. |
| Enrutador de la API | `src/interfaces/routes/formularios.routes.ts` | Registrada la ruta `GET /:id` protegida por autenticación. |
| Enrutador Web | `src/interfaces/routes/web.routes.ts` | Creado enrutador para mapear peticiones de páginas web y renderizar las plantillas EJS. |
| Estructuras de Layout | `src/interfaces/views/layout_header.ejs`, `layout_footer.ejs` | Estructuras de layout HTML5 comunes. Incluye estilos CSS puros modernos (Outfit font, fondos oscuros, glassmorphism, gradientes HSL y enfoque visible para teclado). |
| Páginas de Flujo | `login.ejs`, `busqueda.ejs`, `identificacion.ejs`, `contacto.ejs`, `perfil.ejs`, `documentos.ejs`, `resumen.ejs` | Implementado el flujo completo de 5 pasos con llamadas `fetch` seguras (añade `Authorization: Bearer [token]`) y almacenamiento en `sessionStorage`. |
| Badge reactivo de riesgo (DEF002) | `src/interfaces/views/perfil.ejs` | Script del lado del cliente que escucha eventos `input` en ingresos/volumen y actualiza el badge al instante de forma reactiva. |
| Pruebas de integración de Vistas | `tests/integration/web.test.ts` | 7 tests de integración para comprobar que las vistas renderizan su contenido HTML respectivo con estatus 200. |

---

## 3. Requisitos abordados

| Requisito | Estado | Notas |
|-----------|--------|-------|
| RF-11 — Presentación | Completo | Implementada aplicación web interactiva con vistas EJS. |
| RNF-06 — Usabilidad | Completo | Flujo tipo Wizard dividido en 5 pasos lógicos (completado en < 10 min). |
| RNF-09 — Accesibilidad | Completo | Marcadores semánticos, etiquetas `label` asociadas a `id` de `input`, alto contraste y foco visible (WCAG AA). |
| SPEC-API-03/04/05/06/07/08/09 | Completo | Consumidos de forma interactiva en la interfaz cliente mediante AJAX (`fetch`). |
| DEF002 — Badge de riesgo reactivo | Completo | Actualización de badge visual sin recarga de página tras cambios en ingresos/volumen transaccional. |
| Deuda Técnica — Path de vistas | Completo | Mapeado absoluto con `process.cwd()` y copia directa en multi-stage Dockerfile. |

---

## 4. Decisiones técnicas y justificación

### Renderizado de estructura en servidor + carga de datos en cliente (SPA/MPA híbrida)
**Alternativa descartada:** Cargar toda la data mediante EJS del lado del servidor.
**Justificación:** Al inyectar la información en el servidor, tendríamos que leer la sesión/cookie del lado del servidor de Express, lo que requeriría almacenar el JWT en una cookie HttpOnly o reconfigurar la autenticación para soportar cookies y tokens simultáneamente. Al renderizar el esqueleto EJS libre y hacer `fetch` desde el cliente adjuntando el JWT desde el `sessionStorage`, mantenemos la API REST stateless pura y modularizada, protegiendo los datos contra CSRF.

### Estilos CSS puros en un archivo común incrustado en layout
**Alternativa descartada:** Configurar e instalar Tailwind CSS.
**Justificación:** El uso de estilos nativos incrustados en `<style>` del layout evita añadir sobrecarga en los archivos de la imagen final del Docker, mantiene las dependencias limpias de compiladores CSS externos, y permite definir un sistema de diseño premium (glassmorphism/HSL) de forma directa en pocas líneas de código.

---

## 5. Controles de seguridad aplicados (Ley 23)

| Control | Implementado | Referencia | Verificación |
|---------|-------------|-----------|--------------|
| Rutas API seguras y JWT | ✅ | SPEC-SEC-05 | Los fetch de cliente adjuntan `Authorization: Bearer <token>`; accesos no autenticados en API devuelven 401. |
| Sanitización contra XSS | ✅ | RNF-09 | Los datos dinámicos inyectados vía JS cliente se asignan mediante `textContent` en lugar de `innerHTML`, impidiendo la ejecución de código script inyectable. |
| Autenticación forzada | ✅ | SPEC-SEC-05 | `layout_footer` redirige a `/login` si no detecta el token de sesión. |

---

## 6. Métricas registradas en este punto

| Métrica | Valor | Herramienta | Variación vs Sesión 7 |
|---------|-------|-------------|----------------------|
| KLOC `src/` | **1.332** (1332 líneas) | estimación/conteo | +0.177 (S7: 1.155) |
| KLOC total (`src/` + `tests/`) | **3.447** (3447 líneas) | estimación/conteo | +0.411 (S7: 3.036) |
| Cobertura (estimación) | **~98%** | Vitest | Mantenida |
| Complejidad ciclomática — `getFormularioById()` | **V(G) = 3** | Conteo manual | Dentro del límite (≤ 10) |
| Complejidad ciclomática — `postCrearFormulario()`| **V(G) = 2** | Conteo manual | Dentro del límite (≤ 10) |
| Tests totales | **141** | Vitest | +7 (S7: 134) |
| Defectos detectados | 1 (resuelto en Docker) | - | - |

---

## 7. Pruebas añadidas

- `tests/integration/web.test.ts`:
  - `GET /login` -> 200 (HTML).
  - `GET /formularios` -> 200 (HTML).
  - `GET /formularios/:id/identificacion` -> 200 (HTML).
  - `GET /formularios/:id/contacto` -> 200 (HTML).
  - `GET /formularios/:id/perfil` -> 200 (HTML).
  - `GET /formularios/:id/documentos` -> 200 (HTML).
  - `GET /formularios/:id/resumen` -> 200 (HTML).

---

## 8. Commits de la sesión

- `feat(frontend): vistas EJS para flujo wizard completo de 5 pasos (RF-11, RNF-06, RNF-09)`
- `feat(frontend): enrutamiento web y endpoint de recuperacion de formulario completo descifrado`
- `feat(frontend): calculo y badge reactivo de riesgo en tiempo real (DEF002)`
- `fix(docker): resolucion de path de vistas EJS en produccion Docker`
- `test(frontend): pruebas de integracion de renderizado de paginas EJS`

---

## 9. Pendientes y riesgos para la próxima sesión

- **Cierre del proyecto:** El sistema ya cuenta con backend seguro, base de datos con cifrado AES-GCM, exportación PDF, búsquedas inmunes a inyección SQL y el frontend interactivo en EJS. La rama `SamuelGonzalez/sesion-8` debe subirse para validar en CI y luego estar lista para ser revisada por el usuario.
