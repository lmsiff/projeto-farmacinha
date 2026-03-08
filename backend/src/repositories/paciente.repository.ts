import prisma from '../config/prisma';

export class PacienteRepository {
  findAll() {
    return prisma.paciente.findMany({ orderBy: { nome: 'asc' } });
  }

  findById(id: number) {
    return prisma.paciente.findUnique({ where: { id } });
  }

  findByCpf(cpf: string) {
    return prisma.paciente.findUnique({ where: { cpf } });
  }

  create(data: { nome: string; cpf: string; telefone: string; dataNasc: Date; endereco: string }) {
    return prisma.paciente.create({ data });
  }

  update(id: number, data: Partial<{ nome: string; cpf: string; telefone: string; dataNasc: Date; endereco: string }>) {
    return prisma.paciente.update({ where: { id }, data });
  }

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      // Busca todas as receitas do paciente
      const receitas = await tx.receita.findMany({
        where: { pacienteId: id },
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

      // Remove o paciente
      return tx.paciente.delete({ where: { id } });
    });
  }
}
