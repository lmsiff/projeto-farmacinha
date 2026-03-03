import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('admin', 10);

  await prisma.voluntario.upsert({
    where: { cpf: '000.000.000-00' },
    update: {},
    create: {
      nome: 'admin',
      senha: senhaHash,
      cpf: '000.000.000-00',
      telefone: '(00) 00000-0000',
      dataNasc: new Date('1990-01-01'),
      isAdmin: true,
    },
  });
  console.log('✅ Admin criado: nome=admin, senha=admin');

  const vol1 = await prisma.voluntario.upsert({
    where: { cpf: '111.111.111-11' },
    update: {},
    create: {
      nome: 'Ana Paula',
      senha: await bcrypt.hash('ana123', 10),
      cpf: '111.111.111-11',
      telefone: '(11) 91111-1111',
      dataNasc: new Date('1995-03-15'),
      isAdmin: false,
    },
  });

  const vol2 = await prisma.voluntario.upsert({
    where: { cpf: '222.222.222-22' },
    update: {},
    create: {
      nome: 'Carlos Eduardo',
      senha: await bcrypt.hash('carlos123', 10),
      cpf: '222.222.222-22',
      telefone: '(11) 92222-2222',
      dataNasc: new Date('1988-07-22'),
      isAdmin: false,
    },
  });
  console.log('✅ Voluntários criados');

  const p1 = await prisma.paciente.upsert({
    where: { cpf: '333.333.333-33' },
    update: {},
    create: {
      nome: 'Maria das Graças',
      cpf: '333.333.333-33',
      telefone: '(11) 93333-3333',
      dataNasc: new Date('1955-06-10'),
      endereco: 'Rua das Flores, 123 - Centro',
    },
  });

  const p2 = await prisma.paciente.upsert({
    where: { cpf: '444.444.444-44' },
    update: {},
    create: {
      nome: 'João Ferreira',
      cpf: '444.444.444-44',
      telefone: '(11) 94444-4444',
      dataNasc: new Date('1948-11-25'),
      endereco: 'Av. Brasil, 456 - Jardim América',
    },
  });

  const p3 = await prisma.paciente.upsert({
    where: { cpf: '555.555.555-55' },
    update: {},
    create: {
      nome: 'Luiza Mendes',
      cpf: '555.555.555-55',
      telefone: '(11) 95555-5555',
      dataNasc: new Date('1972-02-14'),
      endereco: 'Rua São Paulo, 789 - Vila Nova',
    },
  });
  console.log('✅ Pacientes criados');

  const m1 = await prisma.medicamento.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nomeComercial: 'Losartana',
      principioAtivo: 'Losartana Potássica',
      dosagem: '50mg',
      laboratorio: 'Neo Química',
      lote: 'L001',
      validade: new Date('2027-06-01'),
      quantidade: 200,
    },
  });

  const m2 = await prisma.medicamento.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nomeComercial: 'Metformina',
      principioAtivo: 'Cloridrato de Metformina',
      dosagem: '850mg',
      laboratorio: 'EMS',
      lote: 'M002',
      validade: new Date('2026-12-01'),
      quantidade: 150,
    },
  });

  const m3 = await prisma.medicamento.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nomeComercial: 'Atenolol',
      principioAtivo: 'Atenolol',
      dosagem: '25mg',
      laboratorio: 'Genérico',
      lote: 'A003',
      validade: new Date('2027-03-01'),
      quantidade: 100,
    },
  });

  const m4 = await prisma.medicamento.upsert({
    where: { id: 4 },
    update: {},
    create: {
      nomeComercial: 'Omeprazol',
      principioAtivo: 'Omeprazol',
      dosagem: '20mg',
      laboratorio: 'Medley',
      lote: 'O004',
      validade: new Date('2026-09-01'),
      quantidade: 80,
    },
  });
  console.log('✅ Medicamentos criados');

  const r1 = await prisma.receita.create({
    data: {
      data: new Date('2026-02-20'),
      medico: 'Dr. Roberto Silva',
      pacienteId: p1.id,
      voluntarioId: vol1.id,
      itens: {
        create: [
          { medicamentoId: m1.id, quantidade: 30 },
          { medicamentoId: m3.id, quantidade: 30 },
        ],
      },
    },
  });

  const r2 = await prisma.receita.create({
    data: {
      data: new Date('2026-02-25'),
      medico: 'Dra. Fernanda Costa',
      pacienteId: p2.id,
      voluntarioId: vol2.id,
      itens: {
        create: [
          { medicamentoId: m2.id, quantidade: 60 },
          { medicamentoId: m4.id, quantidade: 30 },
        ],
      },
    },
  });

  const r3 = await prisma.receita.create({
    data: {
      data: new Date('2026-03-01'),
      medico: 'Dr. Marcos Oliveira',
      pacienteId: p3.id,
      voluntarioId: vol1.id,
      itens: {
        create: [
          { medicamentoId: m1.id, quantidade: 30 },
          { medicamentoId: m2.id, quantidade: 60 },
          { medicamentoId: m4.id, quantidade: 30 },
        ],
      },
    },
  });
  console.log('✅ Receitas criadas');

  await prisma.fila.createMany({
    data: [
      { receitaId: r1.id, posicao: 1, entregue: false },
      { receitaId: r2.id, posicao: 2, entregue: false },
      { receitaId: r3.id, posicao: 3, entregue: false },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Fila criada com 3 itens');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());