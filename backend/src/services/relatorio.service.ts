import { RelatorioRepository } from '../repositories/relatorio.repository';

const repo = new RelatorioRepository();

export class RelatorioService {
  async getDashboard() {
    const [totais, receitasPorMes, medicamentosMaisDistribuidos, pacientesPorFaixaEtaria, alertas] = await Promise.all([
      repo.totais(),
      repo.receitasPorMes(),
      repo.medicamentosMaisDistribuidos(),
      repo.pacientesPorFaixaEtaria(),
      repo.alertas(),
    ]);

    return { totais, receitasPorMes, medicamentosMaisDistribuidos, pacientesPorFaixaEtaria, alertas };
  }
}
