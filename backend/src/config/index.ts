// Keywords para busca no Serper
export const KEYWORDS = [
  // Reprodução humana (prioridade alta)
  'clínica reprodução humana',
  'fertilização in vitro FIV',
  'reprodução assistida',

  // Laboratórios especializados
  'laboratório genética',
  'laboratório citogenética',
  'laboratório andrologia',
  'diagnóstico molecular',

  // Laboratórios gerais (podem ter setores relevantes)
  'laboratório análises clínicas',
];

// Mapeamento de palavras-chave para categorias
export const CATEGORIES: Record<string, string> = {
  'reprodução humana': 'REPRODUCAO_HUMANA',
  'fertilização': 'REPRODUCAO_HUMANA',
  'FIV': 'REPRODUCAO_HUMANA',
  'fiv': 'REPRODUCAO_HUMANA',
  'reprodução assistida': 'REPRODUCAO_HUMANA',
  'genética': 'LABORATORIO_GENETICA',
  'citogenética': 'LABORATORIO_GENETICA',
  'diagnóstico molecular': 'LABORATORIO_GENETICA',
  'andrologia': 'LABORATORIO_ANDROLOGIA',
  'análises clínicas': 'LABORATORIO_ANALISES',
  'hospital': 'HOSPITAL',
  'maternidade': 'HOSPITAL',
} as const;

// Estados alvo
export const UFS = ['RS', 'SC', 'PR'] as const;

// Configurações gerais
export const CONFIG = {
  MIN_POPULATION: parseInt(process.env.MIN_POPULATION || '30000'),
  RATE_LIMIT_MS: parseInt(process.env.RATE_LIMIT_MS || '1000'),
  CONCURRENT_REQUESTS: parseInt(process.env.CONCURRENT_REQUESTS || '3'),
  API_PORT: parseInt(process.env.API_PORT || '3001'),
  SERPER_API_KEY: process.env.SERPER_API_KEY || '',
  CRAWL_TIMEOUT: 10000,
  CONCURRENT_CRAWLS: 1, // Reduzido para 1 para evitar estouro de memória
} as const;

// Configurações de filtros
export const FILTER_CONFIG = {
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.85'),
  ENABLE_URL_PATTERN_FILTER: process.env.ENABLE_URL_PATTERN_FILTER !== 'false',
  ENABLE_NEWS_FILTER: process.env.ENABLE_NEWS_FILTER !== 'false',
  ENABLE_ACADEMIC_FILTER: process.env.ENABLE_ACADEMIC_FILTER !== 'false',
  ENABLE_FUZZY_DEDUP: process.env.ENABLE_FUZZY_DEDUP !== 'false',
  LOG_REJECTIONS: process.env.LOG_REJECTIONS === 'true',
} as const;

// Cidade de referência para cálculo de distância
export const REFERENCE_CITY = {
  name: 'Joaçaba',
  uf: 'SC',
  lat: -27.1721,
  lng: -51.5108,
  ibgeId: 4209003,
} as const;
