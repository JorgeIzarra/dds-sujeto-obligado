import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';
import { putContacto } from '../controllers/contacto.controller';
import { putPerfilEconomico } from '../controllers/perfil-economico.controller';

const router = Router();

router.put('/:id/identificacion', putIdentificacion);
router.put('/:id/contacto', putContacto);
router.put('/:id/perfil-economico', putPerfilEconomico);

export { router as formulariosRouter };
