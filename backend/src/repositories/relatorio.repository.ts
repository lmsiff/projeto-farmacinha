import prisma from '../config/prisma';

export class RelatorioRepository {
  async totais() {
    const [receitas, pacientes, medicamentos, voluntarios] = await Promise.all([
      prisma.receita.count(),
      prisma.paciente.count(),
      prisma.medicamento.count(),
      prisma.voluntario.count({ where: { isAdmin: false } }),
    ]);
    return { receitas, pacientes, medicamentos, voluntarios };
  }

  async receitasPorMes() {
    const seisAtras = new Date();
    seisAtras.setMonth(seisAtras.getMonth() - 5);
    seisAtras.setDate(1);

    const receitas = await prisma.receita.findMany({
      where: { data: { gte: seisAtras } },
      select: { data: true },
    });

    const meses: Record<string, number> = {};
    receitas.forEach(({ data }) => {
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      meses[chave] = (meses[chave] ?? 0) + 1;
    });

    return meses;
  }

  async medicamentosMaisDistribuidos() {
    return prisma.receitaItem.groupBy({
      by: ['medicamentoId'],
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 10,
    }).then(async (grupos) => {
      const ids = grupos.map((g) => g.medicamentoId);
      const meds = await prisma.medicamento.findMany({ where: { id: { in: ids } }, select: { id: true, nomeComercial: true } });
      return grupos.map((g) => ({
        medicamento: meds.find((m) => m.id === g.medicamentoId)?.nomeComercial ?? 'Desconhecido',
        total: g._sum.quantidade ?? 0,
      }));
    });
  }

  async pacientesPorFaixaEtaria() {
    const pacientes = await prisma.paciente.findMany({ select: { dataNasc: true } });
    const faixas: Record<string, number> = { '0-17': 0, '18-39': 0, '40-59': 0, '60+': 0 };

    const hoje = new Date();
    pacientes.forEach(({ dataNasc }) => {
      let idade = hoje.getFullYear() - dataNasc.getFullYear();
      const m = hoje.getMonth() - dataNasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) idade--;

      if (idade < 18) faixas['0-17']++;
      else if (idade < 40) faixas['18-39']++;
      else if (idade < 60) faixas['40-59']++;
      else faixas['60+']++;
    });

    return faixas;
  }

  async alertas() {
    const [estoqueBaixo, receitasVencendo, voluntariosInativos] = await Promise.all([
      prisma.medicamento.count({ where: { quantidade: { lte: 10 } } }),
      prisma.receita.count({
        where: {
          data: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      prisma.voluntario.count({
        where: {
          isAdmin: false,
          receitas: { none: { data: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        },
      }),
    ]);

    return { estoqueBaixo, receitasVencendo, voluntariosInativos };
  }
}
