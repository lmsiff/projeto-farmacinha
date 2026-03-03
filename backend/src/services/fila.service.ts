import { FilaRepository } from '../repositories/fila.repository';

const repo = new FilaRepository();

export class FilaService {
  listar() {
    return repo.findAll();
  }

  async adicionarReceita(receitaId: number) {
    return repo.create(receitaId);
  }

  async marcarEntregue(id: number, entregue: boolean = true) {
    const item = await repo.findById(id);
    if (!item) throw new Error('Item da fila não encontrado.');
    return repo.marcarEntregue(id, entregue);
  }

  async reordenar(ids: number[]) {
    return repo.reordenar(ids);
  }

  async remover(id: number) {
    const item = await repo.findById(id);
    if (!item) throw new Error('Item da fila não encontrado.');
    return repo.delete(id);
  }
}
