import bcrypt from 'bcryptjs';
import { VoluntarioRepository } from '../repositories/voluntario.repository';

const repo = new VoluntarioRepository();

interface VoluntarioInput {
  nome: string;
  senha: string;
  cpf: string;
  telefone: string;
  dataNasc: string;
}

export class VoluntarioService {
  listar() {
    return repo.findAll();
  }

  async buscarPorId(id: number) {
    const vol = await repo.findById(id);
    if (!vol) throw new Error('Voluntário não encontrado.');
    const { senha: _, ...semSenha } = vol;
    return semSenha;
  }

  async criar(input: VoluntarioInput) {
    const existente = await repo.findByCpf(input.cpf);
    if (existente) throw new Error('CPF já cadastrado.');

    const senhaHash = await bcrypt.hash(input.senha, 10);

    return repo.create({
      ...input,
      senha: senhaHash,
      dataNasc: new Date(input.dataNasc),
    });
  }

  async atualizar(id: number, input: Partial<VoluntarioInput>) {
    const vol = await repo.findById(id);
    if (!vol) throw new Error('Voluntário não encontrado.');
    if (vol.isAdmin) throw new Error('Não é possível editar o administrador principal.');

    if (input.cpf) {
      const existente = await repo.findByCpf(input.cpf);
      if (existente && existente.id !== id) throw new Error('CPF já pertence a outro voluntário.');
    }

    const senhaHash = input.senha ? await bcrypt.hash(input.senha, 10) : undefined;

    return repo.update(id, {
      ...input,
      senha: senhaHash,
      dataNasc: input.dataNasc ? new Date(input.dataNasc) : undefined,
    });
  }

  async excluir(id: number) {
    const vol = await repo.findById(id);
    if (!vol) throw new Error('Voluntário não encontrado.');
    if (vol.isAdmin) throw new Error('Não é possível excluir o administrador principal.');
    return repo.delete(id);
  }
}
