import { ReceitaRepository } from '../repositories/receita.repository';

const repo = new ReceitaRepository();

interface ReceitaItemInput {
  medicamentoId: number;
  quantidade: number;
}

interface ReceitaInput {
  data: string;
  medico: string;
  pacienteId: number;
  voluntarioId: number;
  itens: ReceitaItemInput[];
}

export class ReceitaService {
  listar() {
    return repo.findAll();
  }

  async buscarPorId(id: number) {
    const receita = await repo.findById(id);
    if (!receita) throw new Error('Receita não encontrada.');
    return receita;
  }

  criar(input: ReceitaInput) {
    const { itens, data, ...rest } = input;
    if (!itens || itens.length === 0) throw new Error('A receita deve ter pelo menos um medicamento.');
    return repo.create({ ...rest, data: new Date(data) }, itens);
  }

  async atualizar(id: number, input: Partial<ReceitaInput>) {
    await this.buscarPorId(id);
    const { itens, data, ...rest } = input;
    return repo.update(id, { ...rest, data: data ? new Date(data) : undefined }, itens);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    return repo.delete(id);
  }
}
