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

  delete(id: number) {
    return prisma.paciente.delete({ where: { id } });
  }
}
