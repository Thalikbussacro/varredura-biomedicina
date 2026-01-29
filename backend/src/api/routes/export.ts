import { Router } from 'express';
import { db } from '../../db/connection.js';

export const exportRouter = Router();

/**
 * GET /api/export/csv
 * Exporta dados para CSV com filtros opcionais
 */
exportRouter.get('/csv', (req, res) => {
  const { uf, city, category } = req.query;

  let query = `SELECT * FROM v_establishments_export WHERE 1=1`;
  const params: any[] = [];

  if (uf) {
    query += ` AND estado = ?`;
    params.push(uf);
  }

  if (city) {
    query += ` AND cidade LIKE ?`;
    params.push(`%${city}%`);
  }

  if (category) {
    query += ` AND categoria = ?`;
    params.push(category);
  }

  const results = db.prepare(query).all(...params) as any[];

  // Gerar CSV
  const headers = [
    'ID', 'Estado', 'Cidade', 'Nome', 'Categoria', 'Endereco',
    'Site', 'Fonte', 'Telefones', 'Emails', 'WhatsApp', 'Instagram', 'Facebook', 'LinkedIn', 'Distancia (km)'
  ];

  const csvLines = [
    headers.join(';'),
    ...results.map(row => [
      row.id,
      row.estado,
      row.cidade,
      `"${(row.nome || '').replace(/"/g, '""')}"`,
      row.categoria,
      `"${(row.endereco || '').replace(/"/g, '""')}"`,
      row.site || '',
      row.fonte || '',
      `"${(row.telefones || '').replace(/"/g, '""')}"`,
      `"${(row.emails || '').replace(/"/g, '""')}"`,
      `"${(row.whatsapp || '').replace(/"/g, '""')}"`,
      `"${(row.instagram || '').replace(/"/g, '""')}"`,
      `"${(row.facebook || '').replace(/"/g, '""')}"`,
      `"${(row.linkedin || '').replace(/"/g, '""')}"`,
      row.distancia_km || '',
    ].join(';'))
  ];

  const csv = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leads-biomedica-sul.csv');
  res.send('\uFEFF' + csv); // BOM para Excel reconhecer UTF-8
});
