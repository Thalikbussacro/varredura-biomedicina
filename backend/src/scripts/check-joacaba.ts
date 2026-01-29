#!/usr/bin/env tsx

import { db } from '../db/connection.js';

console.log('Procurando Joaçaba...\n');

const cities = db.prepare(`
  SELECT name, uf, ibge_id, lat, lng
  FROM cities
  WHERE name LIKE '%Joa%' OR name LIKE '%açaba%'
`).all();

console.log('Cidades encontradas:');
console.table(cities);

console.log('\nVerificando código 4209409:');
const laguna = db.prepare(`
  SELECT name, uf, ibge_id, lat, lng
  FROM cities
  WHERE ibge_id = 4209409
`).get();

console.table([laguna]);
