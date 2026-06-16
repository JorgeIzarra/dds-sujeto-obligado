import { Router } from 'express';
import { putIdentificacion } from '../controllers/identificacion.controller';

const router = Router();

router.put('/:id/identificacion', putIdentificacion);

export { router as formulariosRouter };
