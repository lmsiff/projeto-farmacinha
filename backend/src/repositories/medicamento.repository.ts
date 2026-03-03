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

  delete(id: number) {
    return prisma.medicamento.delete({ where: { id } });
  }
}
