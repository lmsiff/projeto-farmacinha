import { PacienteRepository } from '../repositories/paciente.repository';

const repo = new PacienteRepository();

interface PacienteInput {
  nome: string;
  cpf: string;
  telefone: string;
  dataNasc: string;
  endereco: string;
}

export class PacienteService {
  async listar() {
    return repo.findAll();
  }

  async buscarPorId(id: number) {
    const paciente = await repo.findById(id);
    if (!paciente) throw new Error('Paciente não encontrado.');
    return paciente;
  }

  async criar(input: PacienteInput) {
    const existente = await repo.findByCpf(input.cpf);
    if (existente) throw new Error('CPF já cadastrado.');

    return repo.create({
      ...input,
      dataNasc: new Date(input.dataNasc),
    });
  }

  async atualizar(id: number, input: Partial<PacienteInput>) {
    await this.buscarPorId(id);

    if (input.cpf) {
      const existente = await repo.findByCpf(input.cpf);
      if (existente && existente.id !== id) throw new Error('CPF já pertence a outro paciente.');
    }

    return repo.update(id, {
      ...input,
      dataNasc: input.dataNasc ? new Date(input.dataNasc) : undefined,
    });
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    return repo.delete(id);
  }
}
