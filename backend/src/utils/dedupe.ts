import { db } from '../db/connection.js';
import { FILTER_CONFIG } from '../config/index.js';

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calcula similaridade entre duas strings (0.0 a 1.0)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Remove estabelecimentos duplicados baseado em nome normalizado + cidade
 */
export function deduplicateEstablishments(): void {
  console.log('🧹 Removendo duplicatas...');

  let totalRemoved = 0;

  // Step 1: Exact duplicates (nome normalizado + cidade)
  console.log('  📋 Buscando duplicatas exatas...');
  const exactDuplicates = db.prepare(`
    SELECT name_normalized, city_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM establishments
    GROUP BY name_normalized, city_id
    HAVING count > 1
  `).all() as { name_normalized: string; city_id: number; count: number; ids: string }[];

  for (const dup of exactDuplicates) {
    const ids = dup.ids.split(',').map(Number);
    const toRemove = ids.slice(1);

    if (toRemove.length > 0) {
      const placeholders = toRemove.map(() => '?').join(',');
      db.prepare(`DELETE FROM establishments WHERE id IN (${placeholders})`).run(...toRemove);
      totalRemoved += toRemove.length;
    }
  }

  console.log(`  ✅ ${totalRemoved} duplicatas exatas removidas`);

  // Step 2: URL-based duplicates (mesmo website, nomes diferentes)
  console.log('  🔗 Buscando duplicatas por URL...');
  const urlDuplicates = db.prepare(`
    SELECT website, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM establishments
    WHERE website IS NOT NULL AND website != ''
    GROUP BY website
    HAVING count > 1
  `).all() as { website: string; count: number; ids: string }[];

  let urlRemoved = 0;
  for (const dup of urlDuplicates) {
    const ids = dup.ids.split(',').map(Number);
    const toRemove = ids.slice(1);

    if (toRemove.length > 0) {
      const placeholders = toRemove.map(() => '?').join(',');
      db.prepare(`DELETE FROM establishments WHERE id IN (${placeholders})`).run(...toRemove);
      urlRemoved += toRemove.length;
      totalRemoved += toRemove.length;
    }
  }

  console.log(`  ✅ ${urlRemoved} duplicatas por URL removidas`);

  // Step 3: Fuzzy duplicates (nomes similares na mesma cidade)
  if (FILTER_CONFIG.ENABLE_FUZZY_DEDUP) {
    console.log('  🔍 Buscando duplicatas fuzzy (pode demorar)...');

    const allEstablishments = db.prepare(`
      SELECT id, name_normalized, city_id, website
      FROM establishments
      ORDER BY city_id, id
    `).all() as { id: number; name_normalized: string; city_id: number; website: string | null }[];

    const similarityThreshold = FILTER_CONFIG.SIMILARITY_THRESHOLD;
    const toRemoveFuzzy: number[] = [];

    for (let i = 0; i < allEstablishments.length; i++) {
      for (let j = i + 1; j < allEstablishments.length; j++) {
        const est1 = allEstablishments[i];
        const est2 = allEstablishments[j];

        // Only compare within same city
        if (est1.city_id !== est2.city_id) break;

        const similarity = calculateSimilarity(est1.name_normalized, est2.name_normalized);

        if (similarity >= similarityThreshold) {
          // Keep the one with more info (has website)
          if (!est1.website && est2.website) {
            toRemoveFuzzy.push(est1.id);
          } else {
            toRemoveFuzzy.push(est2.id);
          }
        }
      }
    }

    if (toRemoveFuzzy.length > 0) {
      const uniqueToRemove = [...new Set(toRemoveFuzzy)];
      const placeholders = uniqueToRemove.map(() => '?').join(',');
      db.prepare(`DELETE FROM establishments WHERE id IN (${placeholders})`).run(...uniqueToRemove);
      totalRemoved += uniqueToRemove.length;
      console.log(`  ✅ ${uniqueToRemove.length} duplicatas fuzzy removidas`);
    } else {
      console.log(`  ✅ Nenhuma duplicata fuzzy encontrada`);
    }
  }

  console.log(`\n  🎯 Total: ${totalRemoved} duplicatas removidas\n`);
}
