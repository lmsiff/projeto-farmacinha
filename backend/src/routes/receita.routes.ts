import { Router } from 'express';
import { ReceitaController } from '../controllers/receita.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new ReceitaController();

router.use(authenticate);

router.get('/', (req, res) => controller.listar(req, res));
router.get('/:id', (req, res) => controller.buscar(req, res));
router.post('/', (req, res) => controller.criar(req, res));
router.put('/:id', (req, res) => controller.atualizar(req, res));
router.delete('/:id', (req, res) => controller.excluir(req, res));

export default router;
