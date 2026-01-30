import express from 'express';
import cors from 'cors';
import { establishmentsRouter } from './routes/establishments.js';
import { exportRouter } from './routes/export.js';
import { configRouter } from './routes/config.js';
import { emailsRouter } from './routes/emails.js';
import validationRouter from './routes/validation.js';
import { db } from '../db/connection.js';
import { CONFIG } from '../config/index.js';

const app = express();
const PORT = CONFIG.API_PORT;

app.use(cors());
app.use(express.json());

app.use('/api/establishments', establishmentsRouter);
app.use('/api/export', exportRouter);
app.use('/api/config', configRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/validation', validationRouter);

/**
 * GET /api/stats
 * Retorna estatísticas gerais do banco
 */
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM establishments').get() as { count: number };
  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM establishments
    GROUP BY category
  `).all();
  const byUf = db.prepare(`
    SELECT c.uf, COUNT(*) as count
    FROM establishments e
    JOIN cities c ON e.city_id = c.id
    GROUP BY c.uf
  `).all();
  const withContacts = db.prepare(`
    SELECT COUNT(DISTINCT establishment_id) as count FROM contacts
  `).get() as { count: number };

  res.json({
    total: total.count,
    withContacts: withContacts.count,
    byCategory,
    byUf,
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Inicia o servidor Express
 */
export function startServer(): void {
  app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Stats: http://localhost:${PORT}/api/stats\n`);
  });
}
