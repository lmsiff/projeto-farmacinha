import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import pacienteRoutes from './routes/paciente.routes';
import medicamentoRoutes from './routes/medicamento.routes';
import receitaRoutes from './routes/receita.routes';
import voluntarioRoutes from './routes/voluntario.routes';
import filaRoutes from './routes/fila.routes';
import relatorioRoutes from './routes/relatorio.routes';

const app = express();

app.use(cors({
  origin: [
    'https://farmacinha.netlify.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/pacientes', pacienteRoutes);
app.use('/api/medicamentos', medicamentoRoutes);
app.use('/api/receitas', receitaRoutes);
app.use('/api/fila', filaRoutes);
app.use('/api/relatorios', relatorioRoutes);

app.use('/api/voluntarios', voluntarioRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

export default app;