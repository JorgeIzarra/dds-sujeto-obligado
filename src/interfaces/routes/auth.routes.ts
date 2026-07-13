import { Router } from 'express';
import { login } from '../controllers/auth.controller';

const router = Router();

// SPEC-API-01: Login endpoint
router.post('/login', login);

export { router as authRouter };
