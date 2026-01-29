#!/usr/bin/env tsx

import { db } from '../db/connection.js';
import { REFERENCE_CITY } from '../config/index.js';

console.log('🔄 Atualizando view v_establishments_export...\n');

try {
  // Dropar view antiga
  console.log('  🗑️  Removendo view antiga...');
  db.prepare('DROP VIEW IF EXISTS v_establishments_export').run();
  console.log('  ✅ View antiga removida\n');

  // Criar view nova com distância
  console.log('  🆕 Criando view atualizada com cálculo de distância...');
  const createView = `
    CREATE VIEW v_establishments_export AS
    SELECT
      e.id,
      c.uf as estado,
      c.name as cidade,
      e.name as nome,
      e.category as categoria,
      e.address as endereco,
      e.website as site,
      e.source as fonte,
      (SELECT GROUP_CONCAT(value, ',') FROM contacts WHERE establishment_id = e.id AND type = 'phone') as telefones,
      (SELECT GROUP_CONCAT(value, ',') FROM contacts WHERE establishment_id = e.id AND type = 'email') as emails,
      (SELECT GROUP_CONCAT(value, ',') FROM contacts WHERE establishment_id = e.id AND type = 'whatsapp') as whatsapp,
      (SELECT GROUP_CONCAT(value, ',') FROM contacts WHERE establishment_id = e.id AND type = 'instagram') as instagram,
      (SELECT GROUP_CONCAT(value, ',') FROM contacts WHERE establishment_id = e.id AND type = 'facebook') as facebook,
      (SELECT GROUP_CONCAT(value, ',') FROM contacts WHERE establishment_id = e.id AND type = 'linkedin') as linkedin,
      CAST(HAVERSINE(c.lat, c.lng, ${REFERENCE_CITY.lat}, ${REFERENCE_CITY.lng}) AS INTEGER) as distancia_km
    FROM establishments e
    JOIN cities c ON e.city_id = c.id
  `;

  db.prepare(createView).run();
  console.log('  ✅ View atualizada com sucesso!\n');

  // Verificar se funcionou
  console.log('  🔍 Verificando view:');
  const sample = db.prepare(`
    SELECT id, estado, cidade, nome, distancia_km
    FROM v_establishments_export
    LIMIT 5
  `).all();

  console.table(sample);
  console.log('\n✅ Migração concluída com sucesso!');

} catch (error) {
  console.error('❌ Erro ao atualizar view:', error);
  process.exit(1);
}
