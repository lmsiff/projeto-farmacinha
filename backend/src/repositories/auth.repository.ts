import prisma from '../config/prisma';

export class AuthRepository {
  async findByNome(nome: string) {
    return prisma.voluntario.findFirst({ where: { nome } });
  }
}
