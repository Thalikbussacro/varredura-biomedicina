import { Router } from 'express';
import { db } from '../../db/connection.js';
import { REFERENCE_CITY } from '../../config/index.js';

export const establishmentsRouter = Router();

/**
 * GET /api/establishments
 * Lista estabelecimentos com filtros opcionais
 */
establishmentsRouter.get('/', (req, res) => {
  const { uf, city, category, search } = req.query;

  let query = `
    SELECT
      e.id,
      c.uf as estado,
      c.name as cidade,
      e.name as nome,
      e.category as categoria,
      e.address as endereco,
      e.website as site,
      e.source as fonte,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'phone') as telefones,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'email') as emails,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'whatsapp') as whatsapp,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'instagram') as instagram,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'facebook') as facebook,
      CAST(HAVERSINE(c.lat, c.lng, ${REFERENCE_CITY.lat}, ${REFERENCE_CITY.lng}) AS INTEGER) as distancia_km
    FROM establishments e
    JOIN cities c ON e.city_id = c.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (uf) {
    query += ` AND c.uf = ?`;
    params.push(uf);
  }

  if (city) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${city}%`);
  }

  if (category) {
    query += ` AND e.category = ?`;
    params.push(category);
  }

  if (search) {
    query += ` AND (e.name LIKE ? OR c.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY c.uf, c.name, e.name`;

  const results = db.prepare(query).all(...params);

  res.json(results);
});

/**
 * GET /api/establishments/categories
 * Lista todas as categorias disponíveis
 */
establishmentsRouter.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT category FROM establishments ORDER BY category
  `).all();

  res.json(categories.map((c: any) => c.category));
});

/**
 * GET /api/establishments/cities
 * Lista cidades que possuem estabelecimentos
 */
establishmentsRouter.get('/cities', (req, res) => {
  const { uf } = req.query;

  let query = `
    SELECT DISTINCT c.name, c.uf
    FROM cities c
    JOIN establishments e ON e.city_id = c.id
  `;

  if (uf) {
    query += ` WHERE c.uf = ?`;
    const cities = db.prepare(query).all(uf);
    res.json(cities);
  } else {
    query += ` ORDER BY c.uf, c.name`;
    const cities = db.prepare(query).all();
    res.json(cities);
  }
});
