import { Router } from 'express';
import { VoluntarioController } from '../controllers/voluntario.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();
const controller = new VoluntarioController();

router.use(authenticate, requireAdmin);

router.get('/', (req, res) => controller.listar(req, res));
router.get('/:id', (req, res) => controller.buscar(req, res));
router.post('/', (req, res) => controller.criar(req, res));
router.put('/:id', (req, res) => controller.atualizar(req, res));
router.delete('/:id', (req, res) => controller.excluir(req, res));

export default router;
