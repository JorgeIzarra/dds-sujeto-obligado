import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';
import { putContacto } from '../controllers/contacto.controller';
import { putPerfilEconomico } from '../controllers/perfil-economico.controller';
import { postDocumento } from '../controllers/documento.controller';
import { postGuardar } from '../controllers/guardar.controller';

const router = Router();

router.put('/:id/identificacion', putIdentificacion);
router.put('/:id/contacto', putContacto);
router.put('/:id/perfil-economico', putPerfilEconomico);
router.post('/:id/documentos', postDocumento);
router.post('/:id/guardar', postGuardar);

export { router as formulariosRouter };
