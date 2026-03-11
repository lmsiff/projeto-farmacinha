import prisma from '../config/prisma';

export class FilaRepository {
  findAll() {
    return prisma.fila.findMany({
      where: { entregue: false },
      orderBy: { posicao: 'asc' },
      include: {
        receita: {
          include: {
            paciente: { select: { id: true, nome: true } },
            voluntario: { select: { id: true, nome: true } },
            itens: { include: { medicamento: { select: { id: true, nomeComercial: true, dosagem: true } } } },
          },
        },
      },
    });
  }

  findEntregues() {
    return prisma.fila.findMany({
      where: { entregue: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        receita: {
          include: {
            paciente: { select: { id: true, nome: true } },
            voluntario: { select: { id: true, nome: true } },
            itens: { include: { medicamento: { select: { id: true, nomeComercial: true, dosagem: true } } } },
          },
        },
      },
    });
  }

  findById(id: number) {
    return prisma.fila.findUnique({
      where: { id },
      include: { receita: { include: { paciente: true, voluntario: true, itens: { include: { medicamento: true } } } } },
    });
  }

  async create(receitaId: number) {
    const maxPosicao = await prisma.fila.aggregate({ _max: { posicao: true } });
    const posicao = (maxPosicao._max.posicao ?? 0) + 1;
    return prisma.fila.create({ data: { receitaId, posicao } });
  }

  marcarEntregue(id: number, entregue: boolean = true) {
    return prisma.fila.update({ where: { id }, data: { entregue } });
  }

  async reordenar(ids: number[]) {
    return prisma.$transaction(
      ids.map((id, index) => prisma.fila.update({ where: { id }, data: { posicao: index + 1 } }))
    );
  }

  delete(id: number) {
    return prisma.fila.delete({ where: { id } });
  }
}
