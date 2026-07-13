import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.redirect('/login');
});

router.get('/login', (req: Request, res: Response) => {
  res.render('login');
});

router.get('/formularios', (req: Request, res: Response) => {
  res.render('busqueda');
});

router.get('/formularios/:id/identificacion', (req: Request, res: Response) => {
  res.render('identificacion', { id: req.params.id });
});

router.get('/formularios/:id/contacto', (req: Request, res: Response) => {
  res.render('contacto', { id: req.params.id });
});

router.get('/formularios/:id/perfil', (req: Request, res: Response) => {
  res.render('perfil', { id: req.params.id });
});

router.get('/formularios/:id/documentos', (req: Request, res: Response) => {
  res.render('documentos', { id: req.params.id });
});

router.get('/formularios/:id/resumen', (req: Request, res: Response) => {
  res.render('resumen', { id: req.params.id });
});

export { router as webRouter };
