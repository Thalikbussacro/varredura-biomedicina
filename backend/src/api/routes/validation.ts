import express from 'express';
import Database from 'better-sqlite3';
import { validationBatchProcessor } from '../../services/validationBatchProcessor.js';
import { OpenAIService } from '../../services/openai.js';

const router = express.Router();
const dbPath = process.env.DB_PATH || '../data/leads.db';
const db = new Database(dbPath);
const openaiService = new OpenAIService();

// POST /api/validation/batch - Start validation batch
router.post('/batch', async (req, res) => {
  try {
    const { establishmentIds, status = 'pending' } = req.body;

    let ids = establishmentIds;

    // If no IDs provided, validate all with specified status
    if (!ids || ids.length === 0) {
      const stmt = db.prepare(`
        SELECT id FROM establishments WHERE validation_status = ?
      `);
      const rows = stmt.all(status) as any[];
      ids = rows.map(r => r.id);
    }

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum estabelecimento para validar' });
    }

    const batchId = await validationBatchProcessor.createBatch(ids);
    res.json({ batchId, total: ids.length });
  } catch (error) {
    console.error('Erro ao criar batch de validação:', error);
    res.status(500).json({ error: 'Erro ao criar batch de validação' });
  }
});

// GET /api/validation/batch/:batchId - Get batch status
router.get('/batch/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const status = validationBatchProcessor.getBatchStatus(batchId);

    if (!status) {
      return res.status(404).json({ error: 'Batch não encontrado' });
    }

    res.json(status);
  } catch (error) {
    console.error('Erro ao buscar status do batch:', error);
    res.status(500).json({ error: 'Erro ao buscar status do batch' });
  }
});

// POST /api/validation/validate/:id - Validate single establishment
router.post('/validate/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const establishment = db.prepare(`
      SELECT id, name, category, website, address
      FROM establishments
      WHERE id = ?
    `).get(id) as any;

    if (!establishment) {
      return res.status(404).json({ error: 'Estabelecimento não encontrado' });
    }

    const result = await openaiService.validateEstablishment({
      name: establishment.name,
      category: establishment.category,
      website: establishment.website,
      address: establishment.address,
    });

    const newStatus = result.isValid ? 'validated' : 'flagged';

    db.prepare(`
      UPDATE establishments
      SET validation_status = ?,
          validation_reason = ?,
          validation_confidence = ?,
          validated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, result.reason, result.confidence, id);

    const updated = db.prepare(`
      SELECT * FROM v_establishments_export WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Erro ao validar estabelecimento:', error);
    res.status(500).json({ error: 'Erro ao validar estabelecimento' });
  }
});

// PATCH /api/validation/:id/override - Manual override
router.patch('/:id/override', (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['manual_approved', 'manual_rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    db.prepare(`
      UPDATE establishments
      SET validation_status = ?,
          validation_reason = ?,
          validation_confidence = 1.0,
          validated_at = datetime('now')
      WHERE id = ?
    `).run(status, reason || 'Override manual', id);

    const updated = db.prepare(`
      SELECT * FROM v_establishments_export WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Erro ao sobrescrever validação:', error);
    res.status(500).json({ error: 'Erro ao sobrescrever validação' });
  }
});

// GET /api/validation/stats - Validation statistics
router.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        validation_status,
        COUNT(*) as count
      FROM establishments
      GROUP BY validation_status
    `).all() as any[];

    const total = db.prepare(`SELECT COUNT(*) as count FROM establishments`).get() as any;

    res.json({
      total: total.count,
      byStatus: stats.reduce((acc, s) => {
        acc[s.validation_status] = s.count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;
