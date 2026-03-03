import { MedicamentoRepository } from '../repositories/medicamento.repository';

const repo = new MedicamentoRepository();

interface MedicamentoInput {
  nomeComercial: string;
  principioAtivo: string;
  dosagem: string;
  laboratorio: string;
  lote: string;
  validade: string;
  quantidade: number;
}

export class MedicamentoService {
  listar() {
    return repo.findAll();
  }

  async buscarPorId(id: number) {
    const med = await repo.findById(id);
    if (!med) throw new Error('Medicamento não encontrado.');
    return med;
  }

  criar(input: MedicamentoInput) {
    return repo.create({ ...input, validade: new Date(input.validade) });
  }

  async atualizar(id: number, input: Partial<MedicamentoInput>) {
    await this.buscarPorId(id);
    return repo.update(id, {
      ...input,
      validade: input.validade ? new Date(input.validade) : undefined,
    });
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    return repo.delete(id);
  }
}
