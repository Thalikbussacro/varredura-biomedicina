import { db } from '../db/connection.js';

/**
 * Remove estabelecimentos duplicados baseado em nome normalizado + cidade
 */
export function deduplicateEstablishments(): void {
  console.log('🧹 Removendo duplicatas...');

  // Encontrar duplicatas por nome normalizado + cidade
  const duplicates = db.prepare(`
    SELECT name_normalized, city_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM establishments
    GROUP BY name_normalized, city_id
    HAVING count > 1
  `).all() as { name_normalized: string; city_id: number; count: number; ids: string }[];

  let removed = 0;

  for (const dup of duplicates) {
    const ids = dup.ids.split(',').map(Number);
    // Manter o primeiro, remover os outros
    const toRemove = ids.slice(1);

    if (toRemove.length > 0) {
      const placeholders = toRemove.map(() => '?').join(',');
      db.prepare(`DELETE FROM establishments WHERE id IN (${placeholders})`).run(...toRemove);
      removed += toRemove.length;
    }
  }

  console.log(`  ✅ ${removed} duplicatas removidas\n`);
}
