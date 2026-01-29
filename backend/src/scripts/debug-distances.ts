#!/usr/bin/env tsx

import { db } from '../db/connection.js';
import { REFERENCE_CITY } from '../config/index.js';

console.log('🔍 Debugando cálculo de distâncias...\n');

console.log('📍 Cidade de referência (Joaçaba):');
console.log(`   IBGE: ${REFERENCE_CITY.ibgeId}`);
console.log(`   Coordenadas: ${REFERENCE_CITY.lat}, ${REFERENCE_CITY.lng}\n`);

// Verificar se as cidades têm coordenadas
console.log('🏙️  Verificando coordenadas das cidades:');
const citiesWithCoords = db.prepare(`
  SELECT name, uf, lat, lng,
    CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_coords
  FROM cities
  LIMIT 10
`).all();

console.table(citiesWithCoords);

// Testar função HAVERSINE
console.log('\n📐 Testando função HAVERSINE:');
const testDistance = db.prepare(`
  SELECT
    name,
    uf,
    lat,
    lng,
    HAVERSINE(lat, lng, ${REFERENCE_CITY.lat}, ${REFERENCE_CITY.lng}) as distancia_raw,
    CAST(HAVERSINE(lat, lng, ${REFERENCE_CITY.lat}, ${REFERENCE_CITY.lng}) AS INTEGER) as distancia_km
  FROM cities
  WHERE lat IS NOT NULL AND lng IS NOT NULL
  LIMIT 10
`).all();

console.table(testDistance);

// Verificar view de export
console.log('\n📊 Verificando view v_establishments_export:');
const viewData = db.prepare(`
  SELECT id, estado, cidade, nome, distancia_km
  FROM v_establishments_export
  LIMIT 10
`).all();

console.table(viewData);

console.log('\n✅ Debug finalizado!');
