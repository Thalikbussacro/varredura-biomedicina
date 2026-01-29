#!/usr/bin/env tsx

import { db } from '../db/connection.js';

/**
 * Migração: Adiciona colunas lat e lng à tabela cities
 */

console.log('🔧 Executando migração: adicionar coordenadas às cidades...\n');

try {
  // Verificar se as colunas já existem
  const tableInfo = db.prepare(`PRAGMA table_info(cities)`).all() as any[];
  const hasLat = tableInfo.some((col: any) => col.name === 'lat');
  const hasLng = tableInfo.some((col: any) => col.name === 'lng');

  if (hasLat && hasLng) {
    console.log('  ✅ Colunas lat e lng já existem na tabela cities');
    console.log('  ⏭️  Migração não necessária\n');
    process.exit(0);
  }

  // Adicionar colunas se não existirem
  if (!hasLat) {
    console.log('  ➕ Adicionando coluna "lat"...');
    db.prepare(`ALTER TABLE cities ADD COLUMN lat REAL`).run();
    console.log('  ✅ Coluna "lat" adicionada');
  }

  if (!hasLng) {
    console.log('  ➕ Adicionando coluna "lng"...');
    db.prepare(`ALTER TABLE cities ADD COLUMN lng REAL`).run();
    console.log('  ✅ Coluna "lng" adicionada');
  }

  // Criar índice
  console.log('  📇 Criando índice para coordenadas...');
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities(lat, lng)`).run();
  console.log('  ✅ Índice criado');

  console.log('\n✅ Migração concluída com sucesso!\n');
  console.log('  💡 Próximo passo: executar o script de importação de coordenadas');
  console.log('     npm run import-coordinates\n');

} catch (error: any) {
  console.error('\n❌ Erro na migração:', error.message);
  process.exit(1);
}

process.exit(0);
