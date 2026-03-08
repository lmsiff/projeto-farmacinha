import prisma from '../config/prisma';

export class VoluntarioRepository {
  findAll() {
    return prisma.voluntario.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cpf: true, telefone: true, dataNasc: true, isAdmin: true, createdAt: true },
    });
  }

  findById(id: number) {
    return prisma.voluntario.findUnique({ where: { id } });
  }

  findByCpf(cpf: string) {
    return prisma.voluntario.findUnique({ where: { cpf } });
  }

  create(data: { nome: string; senha: string; cpf: string; telefone: string; dataNasc: Date; isAdmin?: boolean }) {
    return prisma.voluntario.create({
      data,
      select: { id: true, nome: true, cpf: true, telefone: true, dataNasc: true, isAdmin: true, createdAt: true },
    });
  }

  update(id: number, data: Partial<{ nome: string; senha: string; cpf: string; telefone: string; dataNasc: Date }>) {
    return prisma.voluntario.update({
      where: { id },
      data,
      select: { id: true, nome: true, cpf: true, telefone: true, dataNasc: true, isAdmin: true, updatedAt: true },
    });
  }

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      // Busca todas as receitas do voluntário
      const receitas = await tx.receita.findMany({
        where: { voluntarioId: id },
        select: { id: true },
      });
      const receitaIds = receitas.map((r) => r.id);

      if (receitaIds.length > 0) {
        // Remove entradas da fila vinculadas às receitas
        await tx.fila.deleteMany({ where: { receitaId: { in: receitaIds } } });
        // Remove itens das receitas
        await tx.receitaItem.deleteMany({ where: { receitaId: { in: receitaIds } } });
        // Remove as receitas
        await tx.receita.deleteMany({ where: { id: { in: receitaIds } } });
      }

      // Remove o voluntário
      return tx.voluntario.delete({ where: { id } });
    });
  }
}
