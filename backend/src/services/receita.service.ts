import { ReceitaRepository } from '../repositories/receita.repository';
import prisma from '../config/prisma';

const repo = new ReceitaRepository();

interface ReceitaItemInput {
  medicamentoId: number;
  quantidade: number;
}

interface ReceitaInput {
  data: string;
  medico: string;
  pacienteId: number;
  voluntarioId: number;
  itens: ReceitaItemInput[];
}

export class ReceitaService {
  listar() {
    return repo.findAll();
  }

  async buscarPorId(id: number) {
    const receita = await repo.findById(id);
    if (!receita) throw new Error('Receita não encontrada.');
    return receita;
  }

  // Valida se todos os medicamentos têm estoque suficiente
  // Se for edição, considera que os itens da receita original já estão "reservados"
  private async validarEstoque(itens: ReceitaItemInput[], receitaIdEdicao?: number) {
    // Agrupa por medicamentoId somando quantidades pedidas
    const pedido: Record<number, number> = {};
    for (const item of itens) {
      pedido[item.medicamentoId] = (pedido[item.medicamentoId] || 0) + item.quantidade;
    }

    // Se for edição, busca os itens atuais para "devolver" ao cálculo
    const reservaAtual: Record<number, number> = {};
    if (receitaIdEdicao) {
      const receitaAtual = await repo.findById(receitaIdEdicao);
      for (const item of receitaAtual?.itens ?? []) {
        reservaAtual[item.medicamentoId] = (reservaAtual[item.medicamentoId] || 0) + item.quantidade;
      }
    }

    const medicamentoIds = Object.keys(pedido).map(Number);
    const medicamentos = await prisma.medicamento.findMany({
      where: { id: { in: medicamentoIds } },
    });

    for (const med of medicamentos) {
      const qtdPedida = pedido[med.id] ?? 0;
      const qtdJaReservada = reservaAtual[med.id] ?? 0;
      // Estoque disponível = estoque atual + o que já estava reservado nessa receita
      const estoqueDisponivel = med.quantidade + qtdJaReservada;
      if (qtdPedida > estoqueDisponivel) {
        throw new Error(
          `Estoque insuficiente para "${med.nomeComercial} ${med.dosagem}": disponível ${estoqueDisponivel}, solicitado ${qtdPedida}.`
        );
      }
    }
  }

  async criar(input: ReceitaInput) {
    const { itens, data, ...rest } = input;
    if (!itens || itens.length === 0) throw new Error('A receita deve ter pelo menos um medicamento.');
    await this.validarEstoque(itens);
    return repo.create({ ...rest, data: new Date(data) }, itens);
  }

  async atualizar(id: number, input: Partial<ReceitaInput>) {
    await this.buscarPorId(id);
    const { itens, data, ...rest } = input;
    if (itens && itens.length > 0) {
      await this.validarEstoque(itens, id);
    }
    return repo.update(id, { ...rest, data: data ? new Date(data) : undefined }, itens);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    return repo.delete(id);
  }
}
