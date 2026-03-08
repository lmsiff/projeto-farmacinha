import prisma from '../config/prisma';

interface ReceitaItemInput {
  medicamentoId: number;
  quantidade: number;
}

export class ReceitaRepository {
  findAll() {
    return prisma.receita.findMany({
      orderBy: { data: 'desc' },
      include: {
        paciente: { select: { id: true, nome: true } },
        voluntario: { select: { id: true, nome: true } },
        itens: {
          include: { medicamento: { select: { id: true, nomeComercial: true, dosagem: true } } },
        },
      },
    });
  }

  findById(id: number) {
    return prisma.receita.findUnique({
      where: { id },
      include: {
        paciente: true,
        voluntario: { select: { id: true, nome: true } },
        itens: {
          include: { medicamento: true },
        },
      },
    });
  }

  create(data: { data: Date; medico: string; pacienteId: number; voluntarioId: number }, itens: ReceitaItemInput[]) {
    return prisma.receita.create({
      data: {
        ...data,
        itens: { create: itens },
      },
      include: {
        paciente: true,
        voluntario: { select: { id: true, nome: true } },
        itens: { include: { medicamento: true } },
      },
    });
  }

  update(
    id: number,
    data: Partial<{ data: Date; medico: string; pacienteId: number; voluntarioId: number }>,
    itens?: ReceitaItemInput[]
  ) {
    return prisma.$transaction(async (tx) => {
      if (itens) {
        await tx.receitaItem.deleteMany({ where: { receitaId: id } });
      }
      return tx.receita.update({
        where: { id },
        data: {
          ...data,
          ...(itens && { itens: { create: itens } }),
        },
        include: {
          paciente: true,
          voluntario: { select: { id: true, nome: true } },
          itens: { include: { medicamento: true } },
        },
      });
    });
  }

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      // Remove entrada da fila (se existir)
      await tx.fila.deleteMany({ where: { receitaId: id } });
      // Remove os itens da receita
      await tx.receitaItem.deleteMany({ where: { receitaId: id } });
      // Remove a receita
      return tx.receita.delete({ where: { id } });
    });
  }
}
