import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';
import { putContacto } from '../controllers/contacto.controller';
import { putPerfilEconomico } from '../controllers/perfil-economico.controller';
import { postDocumento } from '../controllers/documento.controller';
import { postGuardar } from '../controllers/guardar.controller';
import { putFormulario, getFormularioById, postCrearFormulario } from '../controllers/formulario.controller';
import { postExportarPDF, getPDFJob } from '../controllers/pdf.controller';
import { getFormularios } from '../controllers/busqueda.controller';
import { authenticate, authorize, checkEdicionFormulario } from '../../security/auth.middleware';

const router = Router();

// SPEC-SEC-05: Toda ruta de datos requiere autenticación
router.use(authenticate);

// SPEC-API-09: Búsqueda general
router.get('/', getFormularios);

// POST new blank formulario
router.post('/', postCrearFormulario);

// GET single decrypted formulario
router.get('/:id', getFormularioById);

router.put('/:id/identificacion', checkEdicionFormulario, putIdentificacion);
router.put('/:id/contacto', checkEdicionFormulario, putContacto);
router.put('/:id/perfil-economico', checkEdicionFormulario, putPerfilEconomico);
router.post('/:id/documentos', checkEdicionFormulario, postDocumento);
router.post('/:id/guardar', checkEdicionFormulario, postGuardar);

// SPEC-API-08: Exportación PDF
router.get('/:id/pdf', postExportarPDF);
router.get('/:id/pdf/:jobId', getPDFJob);

// SPEC-API-10: Edición de formulario aprobado (RN-06) — Supervisor únicamente
router.put('/:id', authorize(['SUPERVISOR']), checkEdicionFormulario, putFormulario);

export { router as formulariosRouter };
