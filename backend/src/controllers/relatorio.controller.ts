import { Request, Response } from 'express';
import { RelatorioService } from '../services/relatorio.service';

const service = new RelatorioService();

export class RelatorioController {
  async dashboard(req: Request, res: Response): Promise<void> {
    try {
      res.json(await service.getDashboard());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
