import { collectCities } from './collectors/ibge.js';
import { collectRedlara } from './collectors/redlara.js';
import { collectSerper } from './collectors/serper.js';
import { enrichEstablishments } from './enrichment/crawler.js';
import { deduplicateEstablishments } from './utils/dedupe.js';
import { initDatabase } from './db/connection.js';

/**
 * Pipeline principal de coleta de dados
 * Executa todos os coletores em sequência
 */
export async function runPipeline(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  PIPELINE DE COLETA - ESTÁGIOS BIOMEDICINA SUL');
  console.log('═══════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // 1. Inicializar banco
    console.log('📦 Inicializando banco de dados...\n');
    initDatabase();

    // 2. Coletar cidades
    await collectCities();

    // 3. Coletar REDLARA (fonte primária de reprodução humana)
    await collectRedlara();

    // 4. Coletar via Serper
    await collectSerper();

    // 5. Deduplicar
    deduplicateEstablishments();

    // 6. Enriquecer com crawling
    await enrichEstablishments();

    // 7. Deduplicar novamente após enriquecimento
    deduplicateEstablishments();

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ PIPELINE CONCLUÍDO em ${elapsed} minutos`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro no pipeline:', error);
    throw error;
  }
}
