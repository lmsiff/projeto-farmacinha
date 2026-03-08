import prisma from '../config/prisma';

export class MedicamentoRepository {
  findAll() {
    return prisma.medicamento.findMany({ orderBy: { nomeComercial: 'asc' } });
  }

  findById(id: number) {
    return prisma.medicamento.findUnique({ where: { id } });
  }

  create(data: {
    nomeComercial: string;
    principioAtivo: string;
    dosagem: string;
    laboratorio: string;
    lote: string;
    validade: Date;
    quantidade: number;
  }) {
    return prisma.medicamento.create({ data });
  }

  update(id: number, data: Partial<{
    nomeComercial: string;
    principioAtivo: string;
    dosagem: string;
    laboratorio: string;
    lote: string;
    validade: Date;
    quantidade: number;
  }>) {
    return prisma.medicamento.update({ where: { id }, data });
  }

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      // Busca os ReceitaItens que usam este medicamento
      const itensAfetados = await tx.receitaItem.findMany({
        where: { medicamentoId: id },
        select: { receitaId: true },
      });
      const receitaIds = [...new Set(itensAfetados.map((i) => i.receitaId))];

      // Remove os itens que referenciam este medicamento
      await tx.receitaItem.deleteMany({ where: { medicamentoId: id } });

      if (receitaIds.length > 0) {
        // Verifica quais receitas ficaram sem nenhum item
        const receitasVazias = await tx.receita.findMany({
          where: {
            id: { in: receitaIds },
            itens: { none: {} },
          },
          select: { id: true },
        });
        const receitasVaziasIds = receitasVazias.map((r) => r.id);

        if (receitasVaziasIds.length > 0) {
          // Remove entradas da fila das receitas vazias
          await tx.fila.deleteMany({ where: { receitaId: { in: receitasVaziasIds } } });
          // Remove as receitas que ficaram sem itens
          await tx.receita.deleteMany({ where: { id: { in: receitasVaziasIds } } });
        }
      }

      // Remove o medicamento
      return tx.medicamento.delete({ where: { id } });
    });
  }
}
