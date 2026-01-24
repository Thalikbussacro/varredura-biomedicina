import axios from 'axios';
import pLimit from 'p-limit';
import { db } from '../db/connection.js';
import { KEYWORDS, CATEGORIES, CONFIG } from '../config/index.js';
import { normalizeString } from '../utils/normalize.js';
import { delay } from '../utils/delay.js';

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic?: SerperResult[];
}

interface City {
  id: number;
  uf: string;
  name: string;
}

/**
 * Realiza busca via Serper API (Google Search)
 */
async function searchSerper(query: string): Promise<SerperResult[]> {
  if (!CONFIG.SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY não configurada');
  }

  const response = await axios.post<SerperResponse>(
    'https://google.serper.dev/search',
    { q: query, gl: 'br', hl: 'pt-br', num: 10 },
    {
      headers: {
        'X-API-KEY': CONFIG.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    }
  );

  return response.data.organic || [];
}

/**
 * Infere categoria baseado no título e snippet
 */
function inferCategory(title: string, snippet: string): string {
  const text = `${title} ${snippet}`.toLowerCase();

  for (const [keyword, category] of Object.entries(CATEGORIES)) {
    if (text.includes(keyword.toLowerCase())) {
      return category;
    }
  }

  return 'OUTROS';
}

/**
 * Verifica se o resultado é irrelevante (redes sociais, portais de vagas, etc)
 */
function isIrrelevantResult(result: SerperResult): boolean {
  const irrelevantPatterns = [
    /facebook\.com/i,
    /instagram\.com/i,
    /linkedin\.com/i,
    /twitter\.com/i,
    /youtube\.com/i,
    /doctoralia/i,
    /boaforma/i,
    /wikipedia/i,
    /reclameaqui/i,
    /jusbrasil/i,
    /catho/i,
    /vagas\.com/i,
    /indeed/i,
    /gupy\.io/i,
    /infojobs/i,
    /olx\.com/i,
  ];

  return irrelevantPatterns.some(pattern => pattern.test(result.link));
}

/**
 * Coleta estabelecimentos via Serper API
 * Busca por cidade + keyword
 */
export async function collectSerper(): Promise<void> {
  console.log('🔍 Iniciando buscas via Serper...');

  const cities = db.prepare(`
    SELECT id, uf, name FROM cities ORDER BY population DESC
  `).all() as City[];

  console.log(`  📍 ${cities.length} cidades para processar`);
  console.log(`  🔑 ${KEYWORDS.length} keywords por cidade`);
  console.log(`  📊 Total estimado: ${cities.length * KEYWORDS.length} buscas\n`);

  const limit = pLimit(CONFIG.CONCURRENT_REQUESTS);

  const stmtCheckSearch = db.prepare(`
    SELECT id FROM search_log WHERE city_id = ? AND keyword = ? AND source = 'serper'
  `);

  const stmtLogSearch = db.prepare(`
    INSERT INTO search_log (city_id, keyword, source, results_count)
    VALUES (?, ?, 'serper', ?)
  `);

  const stmtInsertEstablishment = db.prepare(`
    INSERT OR IGNORE INTO establishments
    (name, name_normalized, city_id, category, website, source, source_url)
    VALUES (?, ?, ?, ?, ?, 'serper', ?)
  `);

  let totalSearches = 0;
  let totalResults = 0;

  for (const city of cities) {
    const tasks = KEYWORDS.map(keyword =>
      limit(async () => {
        // Verificar se já buscou
        const existing = stmtCheckSearch.get(city.id, keyword);
        if (existing) {
          return;
        }

        const query = `${keyword} ${city.name} ${city.uf}`;

        try {
          await delay(CONFIG.RATE_LIMIT_MS);
          const results = await searchSerper(query);

          stmtLogSearch.run(city.id, keyword, results.length);
          totalSearches++;

          for (const result of results) {
            // Filtrar resultados irrelevantes
            if (isIrrelevantResult(result)) continue;

            const category = inferCategory(result.title, result.snippet);

            stmtInsertEstablishment.run(
              result.title,
              normalizeString(result.title),
              city.id,
              category,
              result.link,
              result.link
            );
            totalResults++;
          }

          process.stdout.write(`\r  🔍 Buscas: ${totalSearches} | Resultados: ${totalResults}`);

        } catch (error: any) {
          if (error.response?.status === 429) {
            console.warn('\n  ⚠️  Rate limit atingido, aguardando...');
            await delay(10000);
          } else {
            console.error(`\n  ❌ Erro na busca "${query}":`, error.message);
          }
        }
      })
    );

    await Promise.all(tasks);
  }

  console.log(`\n  ✅ Coleta Serper finalizada: ${totalSearches} buscas, ${totalResults} resultados\n`);
}
