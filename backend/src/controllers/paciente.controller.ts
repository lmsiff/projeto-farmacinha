import { Request, Response } from 'express';
import { PacienteService } from '../services/paciente.service';

const service = new PacienteService();

export class PacienteController {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      res.json(await service.listar());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async buscar(req: Request, res: Response): Promise<void> {
    try {
      res.json(await service.buscarPorId(Number(req.params.id)));
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const paciente = await service.criar(req.body);
      res.status(201).json(paciente);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      res.json(await service.atualizar(Number(req.params.id), req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      await service.excluir(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
}
