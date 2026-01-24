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
 * Verifica se o título é muito genérico ou é uma keyword de busca
 */
function isGenericTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase().trim();

  // Títulos muito curtos (menos de 10 caracteres)
  if (lowerTitle.length < 10) return true;

  // Títulos genéricos ou keywords de busca
  const genericPatterns = [
    /^exames$/i,
    /^especialista em/i,
    /^clínica de/i,
    /^laboratório de/i,
    /^hospital$/i,
    /^centro de$/i,
    /especialista em fertilidade \w+$/i, // "Especialista em fertilidade [cidade]"
    /fertilização in vitro$/i,
    /reprodução assistida$/i,
    /análises clínicas$/i,
  ];

  return genericPatterns.some(pattern => pattern.test(lowerTitle));
}

/**
 * Verifica se o estabelecimento é relevante para estágios em biomedicina
 * Filtra ginecologia geral e hospitais não especializados
 */
function isRelevantEstablishment(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  // ACEITAR: Clínicas/centros de reprodução assistida, FIV, fertilidade
  const acceptPatterns = [
    /reprodução.*assistida/i,
    /fertilização.*in.*vitro/i,
    /fiv\b/i,
    /fertilidade/i,
    /andrologia/i,
    /genética/i,
    /citogenética/i,
    /embriologia/i,
    /banco.*sêmen/i,
    /banco.*óvulos/i,
    /criopreservação/i,
  ];

  // Se tem termos relevantes, aceitar
  if (acceptPatterns.some(pattern => pattern.test(text))) {
    return true;
  }

  // REJEITAR: Ginecologia geral SEM menção a reprodução/fertilidade
  if (/ginecolog/i.test(text) && !acceptPatterns.some(p => p.test(text))) {
    return false;
  }

  // REJEITAR: Hospital genérico SEM especialização
  if (/hospital/i.test(title) && !acceptPatterns.some(p => p.test(text))) {
    return false;
  }

  // REJEITAR: Clínica médica geral
  if (/clínica médica/i.test(text) && !acceptPatterns.some(p => p.test(text))) {
    return false;
  }

  // Aceitar laboratórios de análises clínicas (podem ter setor de andrologia)
  if (/laborat[óo]rio/i.test(text)) {
    return true;
  }

  // Aceitar qualquer coisa que tenha passado pelos filtros anteriores
  return true;
}

/**
 * Verifica se o resultado é irrelevante (redes sociais, portais de vagas, PDFs, etc)
 */
function isIrrelevantResult(result: SerperResult): boolean {
  // Filtrar URLs de arquivos (PDFs, DOCs, planilhas)
  const filePatterns = [
    /\.pdf$/i,
    /\.doc$/i,
    /\.docx$/i,
    /\.xls$/i,
    /\.xlsx$/i,
    /\.ppt$/i,
    /\.pptx$/i,
  ];

  if (filePatterns.some(pattern => pattern.test(result.link))) {
    return true;
  }

  // Filtrar sites irrelevantes
  const irrelevantPatterns = [
    /facebook\.com/i,
    /instagram\.com/i,
    /linkedin\.com/i,
    /twitter\.com/i,
    /youtube\.com/i,
    /tiktok\.com/i,
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
    /mercadolivre/i,
    /google\.com/i,
    /youtube/i,
  ];

  if (irrelevantPatterns.some(pattern => pattern.test(result.link))) {
    return true;
  }

  // Filtrar títulos genéricos
  if (isGenericTitle(result.title)) {
    return true;
  }

  return false;
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

            // Filtrar estabelecimentos não relevantes para biomedicina
            if (!isRelevantEstablishment(result.title, result.snippet)) continue;

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
          } else if (error.message?.includes('SERPER_API_KEY')) {
            console.error(`\n  ❌ Erro: SERPER_API_KEY não configurada. Configure no arquivo .env`);
            return; // Pula as buscas se não tiver API key
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
