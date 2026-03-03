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

  delete(id: number) {
    return prisma.voluntario.delete({ where: { id } });
  }
}
