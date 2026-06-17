import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';
import { putContacto } from '../controllers/contacto.controller';

const router = Router();

router.put('/:id/identificacion', putIdentificacion);
router.put('/:id/contacto', putContacto);

export { router as formulariosRouter };
