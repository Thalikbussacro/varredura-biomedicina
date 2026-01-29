import axios from 'axios';
import pLimit from 'p-limit';
import { db } from '../db/connection.js';
import { KEYWORDS, CATEGORIES, CONFIG, FILTER_CONFIG } from '../config/index.js';
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
    // Navegação
    /^página inicial/i,
    /^home\s*$/i,
    /^início$/i,
    /^bem.*vindo/i,
    /^sobre (nós|a empresa)/i,
    /^contato$/i,
    /^localização$/i,
    // Just city + keyword
    /^[a-záàâãéèêíïóôõöúçñ\s]+ - (rs|sc|pr)$/i,
    // News-like titles
    /^vaga de emprego/i,
    /^curso de/i,
    /^especialização em/i,
    /^pós.*graduação/i,
    // Generic listings
    /^lista de/i,
    /^encontre/i,
    /^busca por/i,
  ];

  return genericPatterns.some(pattern => pattern.test(lowerTitle));
}

/**
 * Verifica se a URL tem padrões irrelevantes (notícias, jobs, docs)
 */
function hasIrrelevantUrlPattern(url: string): boolean {
  const urlLower = url.toLowerCase();

  // News article patterns
  const newsPatterns = [
    /\/noticia\//i,
    /\/noticias\//i,
    /\/artigo\//i,
    /\/materia\//i,
    /\/reportagem\//i,
    /\/post\//i,
    /\/blog\//i,
    /\/(20\d{2})\/\d{2}\//i,  // Date patterns like /2024/01/
  ];

  // Job listing patterns
  const jobPatterns = [
    /\/vaga[s]?\//i,
    /\/emprego[s]?\//i,
    /\/carreira[s]?\//i,
    /\/oportunidade[s]?\//i,
    /\/trabalhe.*conosco/i,
  ];

  // PDF/document indicators (not just extension)
  const docPatterns = [
    /\/pdf\//i,
    /\/arquivo[s]?\//i,
    /\/download[s]?\//i,
    /\/publicac[o|a][o|e][s]?\//i,
    /\.pdf[?#]/i,  // PDF with query params
  ];

  return [...newsPatterns, ...jobPatterns, ...docPatterns]
    .some(pattern => pattern.test(urlLower));
}

/**
 * Verifica se é PDF ou documento (detecção melhorada)
 */
function isPdfOrDocument(result: SerperResult): boolean {
  const url = result.link.toLowerCase();
  const title = result.title.toLowerCase();

  // File extension patterns (including query params)
  const fileExtensions = [
    /\.pdf([?#]|$)/i,
    /\.doc([?#]|$)/i,
    /\.docx([?#]|$)/i,
    /\.xls([?#]|$)/i,
    /\.xlsx([?#]|$)/i,
    /\.ppt([?#]|$)/i,
    /\.pptx([?#]|$)/i,
  ];

  // Content-Type indicators in URL
  const contentTypeIndicators = [
    /application\/pdf/i,
    /content.*type.*pdf/i,
  ];

  // Title indicators
  const titleIndicators = [
    /\[pdf\]/i,
    /\(pdf\)/i,
    /\.pdf\s*$/i,
    /download.*pdf/i,
  ];

  return fileExtensions.some(p => p.test(url)) ||
         contentTypeIndicators.some(p => p.test(url)) ||
         titleIndicators.some(p => p.test(title));
}

/**
 * Detecta artigos de notícias
 */
function isNewsArticle(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  const newsIndicators = [
    // Temporal indicators
    /publicado em/i,
    /\d{1,2}\/\d{1,2}\/\d{4}/,  // Date format
    /há \d+ (hora|dia|semana|mês|ano)/i,
    // News language
    /segundo.*especialista/i,
    /de acordo com/i,
    /conforme.*noticiado/i,
    /reportagem/i,
    /matéria/i,
    // Update/news keywords
    /atualizado em/i,
    /última atualização/i,
    /leia mais/i,
    /saiba mais/i,
  ];

  return newsIndicators.some(pattern => pattern.test(text));
}

/**
 * Detecta papers acadêmicos
 */
function isAcademicPaper(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  const academicIndicators = [
    /revista científica/i,
    /artigo científico/i,
    /dissertação/i,
    /tese de (mestrado|doutorado)/i,
    /monografia/i,
    /anais de/i,
    /resumo.*expandido/i,
    /abstract/i,
    /keywords:/i,
    /palavras.*chave:/i,
    /doi:/i,
    /issn/i,
    /volume.*número/i,
  ];

  return academicIndicators.some(pattern => pattern.test(text));
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
 * Registra um resultado rejeitado no banco de dados
 */
function logRejectedResult(
  result: SerperResult,
  cityId: number,
  keyword: string,
  reason: string
): void {
  if (!FILTER_CONFIG.LOG_REJECTIONS) return;

  try {
    const stmtLog = db.prepare(`
      INSERT INTO rejected_results (url, title, reason, city_id, keyword)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmtLog.run(result.link, result.title, reason, cityId, keyword);
  } catch (error) {
    // Silencioso - não queremos quebrar o fluxo por erro de logging
  }
}

/**
 * Verifica se o resultado é irrelevante (redes sociais, portais de vagas, PDFs, etc)
 * Retorna: [isIrrelevant, reason]
 */
function isIrrelevantResult(result: SerperResult): [boolean, string | null] {
  // Verificar PDFs e documentos (detecção melhorada)
  if (isPdfOrDocument(result)) {
    return [true, 'pdf'];
  }

  // Verificar padrões de URL irrelevantes
  if (FILTER_CONFIG.ENABLE_URL_PATTERN_FILTER && hasIrrelevantUrlPattern(result.link)) {
    return [true, 'url_pattern'];
  }

  // Filtrar sites irrelevantes (blacklist expandida)
  const irrelevantPatterns = [
    // Social media
    /facebook\.com/i,
    /instagram\.com/i,
    /linkedin\.com/i,
    /twitter\.com/i,
    /youtube\.com/i,
    /tiktok\.com/i,

    // Health directories
    /doctoralia/i,
    /boaforma/i,

    // Generic
    /wikipedia/i,
    /reclameaqui/i,
    /google\.com/i,

    // Job boards
    /catho/i,
    /vagas\.com/i,
    /indeed/i,
    /gupy\.io/i,
    /infojobs/i,
    /trampos\.co/i,
    /99jobs/i,
    /empregos\.com\.br/i,
    /curriculum\.com\.br/i,
    /glassdoor/i,

    // Marketplaces
    /olx\.com/i,
    /mercadolivre/i,

    // News portals (major)
    /g1\.globo\.com/i,
    /folha\.uol\.com/i,
    /estadao\.com\.br/i,
    /\buol\.com\.br/i,
    /\br7\.com/i,
    /band\.uol\.com\.br/i,
    /noticias\.uol\.com\.br/i,

    // Regional news
    /gauchazh\.clicrbs\.com\.br/i,
    /zerohora\.com/i,
    /nsctotal\.com\.br/i,
    /diariocatarinense\.com\.br/i,
    /tribunapr\.com\.br/i,
    /\bnoticias\./i,
    /\bnoticia\./i,
    /\bnews\./i,

    // Academic/Research
    /scielo\.br/i,
    /pubmed/i,
    /scholar\.google/i,
    /researchgate\.net/i,
    /repositorio\./i,
    /tede\./i,
    /bdtd\./i,

    // Government (generic)
    /planalto\.gov\.br/i,

    // Directories
    /guialocal/i,
    /apontador/i,
    /telelistas/i,
  ];

  if (irrelevantPatterns.some(pattern => pattern.test(result.link))) {
    return [true, 'domain_blacklist'];
  }

  // Verificar se é artigo de notícia
  if (FILTER_CONFIG.ENABLE_NEWS_FILTER && isNewsArticle(result.title, result.snippet)) {
    return [true, 'news'];
  }

  // Verificar se é paper acadêmico
  if (FILTER_CONFIG.ENABLE_ACADEMIC_FILTER && isAcademicPaper(result.title, result.snippet)) {
    return [true, 'academic'];
  }

  // Filtrar títulos genéricos
  if (isGenericTitle(result.title)) {
    return [true, 'generic_title'];
  }

  return [false, null];
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
            const [isIrrelevant, reason] = isIrrelevantResult(result);
            if (isIrrelevant) {
              if (reason) logRejectedResult(result, city.id, keyword, reason);
              continue;
            }

            // Filtrar estabelecimentos não relevantes para biomedicina
            if (!isRelevantEstablishment(result.title, result.snippet)) {
              logRejectedResult(result, city.id, keyword, 'irrelevant');
              continue;
            }

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
