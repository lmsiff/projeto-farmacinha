import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repositories/auth.repository';

const repo = new AuthRepository();

export class AuthService {
  async login(nome: string, senha: string) {
    const voluntario = await repo.findByNome(nome);

    if (!voluntario) {
      throw new Error('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(senha, voluntario.senha);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas.');
    }

    const payload = {
      id: voluntario.id,
      nome: voluntario.nome,
      isAdmin: voluntario.isAdmin,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '8h',
    });

    return {
      token,
      user: {
        id: voluntario.id,
        nome: voluntario.nome,
        isAdmin: voluntario.isAdmin,
      },
    };
  }
}
