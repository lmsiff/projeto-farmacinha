import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const service = new AuthService();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { nome, senha } = req.body;

    if (!nome || !senha) {
      res.status(400).json({ error: 'Nome e senha são obrigatórios.' });
      return;
    }

    try {
      const result = await service.login(nome, senha);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }
}
