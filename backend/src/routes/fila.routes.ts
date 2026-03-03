import { Router } from 'express';
import { FilaController } from '../controllers/fila.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new FilaController();

router.use(authenticate);

router.get('/', (req, res) => controller.listar(req, res));
router.post('/', (req, res) => controller.adicionar(req, res));
router.patch('/:id/entregar', (req, res) => controller.marcarEntregue(req, res));
router.patch('/reordenar', (req, res) => controller.reordenar(req, res));
router.delete('/:id', (req, res) => controller.remover(req, res));

export default router;
