import { FilaRepository } from '../repositories/fila.repository';
import prisma from '../config/prisma';

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

    const jaEntregue = item.entregue;

    // Se está marcando como entregue (e ainda não estava entregue), deduz estoque
    if (entregue && !jaEntregue) {
      await prisma.$transaction(async (tx) => {
        for (const receitaItem of item.receita.itens) {
          const med = await tx.medicamento.findUnique({ where: { id: receitaItem.medicamentoId } });
          if (!med) throw new Error(`Medicamento #${receitaItem.medicamentoId} não encontrado.`);
          if (med.quantidade < receitaItem.quantidade) {
            throw new Error(
              `Estoque insuficiente para "${med.nomeComercial}": disponível ${med.quantidade}, necessário ${receitaItem.quantidade}.`
            );
          }
          await tx.medicamento.update({
            where: { id: receitaItem.medicamentoId },
            data: { quantidade: { decrement: receitaItem.quantidade } },
          });
        }
        await tx.fila.update({ where: { id }, data: { entregue: true } });
      });
      return repo.findById(id);
    }

    // Se está desmarcando entrega, devolve estoque
    if (!entregue && jaEntregue) {
      await prisma.$transaction(async (tx) => {
        for (const receitaItem of item.receita.itens) {
          await tx.medicamento.update({
            where: { id: receitaItem.medicamentoId },
            data: { quantidade: { increment: receitaItem.quantidade } },
          });
        }
        await tx.fila.update({ where: { id }, data: { entregue: false } });
      });
      return repo.findById(id);
    }

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
