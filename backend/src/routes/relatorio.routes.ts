import { Router } from 'express';
import { RelatorioController } from '../controllers/relatorio.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new RelatorioController();

router.use(authenticate);
router.get('/dashboard', (req, res) => controller.dashboard(req, res));

export default router;
