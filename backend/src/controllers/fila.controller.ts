import { Request, Response } from 'express';
import { FilaService } from '../services/fila.service';

const service = new FilaService();

export class FilaController {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      res.json(await service.listar());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async listarEntregues(req: Request, res: Response): Promise<void> {
    try {
      res.json(await service.listarEntregues());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async adicionar(req: Request, res: Response): Promise<void> {
    try {
      const { receitaId } = req.body;
      if (!receitaId) {
        res.status(400).json({ error: 'receitaId é obrigatório.' });
        return;
      }
      res.status(201).json(await service.adicionarReceita(Number(receitaId)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async marcarEntregue(req: Request, res: Response): Promise<void> {
    try {
      const entregue = req.body?.entregue !== undefined ? Boolean(req.body.entregue) : true;
      res.json(await service.marcarEntregue(Number(req.params.id), entregue));
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  async reordenar(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'ids deve ser um array.' });
        return;
      }
      res.json(await service.reordenar(ids));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async remover(req: Request, res: Response): Promise<void> {
    try {
      await service.remover(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
}
