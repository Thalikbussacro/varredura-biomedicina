# Plano Completo: Sistema de Varredura de Estabelecimentos para Estágio em Biomedicina (Sul do Brasil)

## 1. Visão Geral do Projeto

### Objetivo
Criar uma aplicação para coletar, enriquecer e visualizar dados de estabelecimentos no Sul do Brasil (RS, SC, PR) onde uma biomédica possa realizar estágio, com foco em:
- Clínicas de reprodução humana assistida
- Laboratórios de genética e citogenética
- Laboratórios de análises clínicas (com foco em andrologia)
- Hospitais com serviços de reprodução/maternidade
- Centros de diagnóstico molecular
- Bancos de sangue de cordão/gametas

### Resultado Final
- Backend Node.js que coleta e processa os dados
- Frontend React com tabela interativa
- Filtros por UF, cidade, categoria
- Ordenação por qualquer coluna
- Exportação CSV
- Banco SQLite local com todos os leads

### Restrições
- Orçamento: ~R$100 (usar Serper free tier de 2.500 buscas)
- Execução única (não precisa de atualização incremental)
- Rodar localmente na máquina do usuário
- Cidades com mais de 30.000 habitantes

---

## 2. Estimativas

### Cidades Alvo (população >30k)
- **RS**: ~45 cidades
- **SC**: ~35 cidades  
- **PR**: ~50 cidades
- **Total**: ~130 cidades

### Volume de Buscas (Serper)
- 130 cidades × 8 keywords = 1.040 buscas primárias
- ~500 buscas para enriquecimento/refinamento
- **Total**: ~1.540 buscas (dentro do free tier de 2.500)

### Leads Esperados
- Clínicas de reprodução: ~40
- Laboratórios de análises/genética: ~200-300
- Hospitais relevantes: ~50-80
- **Total estimado**: 300-500 estabelecimentos

---

## 3. Stack Tecnológica

### Backend
```
Node.js 20+
TypeScript 5+
SQLite (via better-sqlite3)
Express.js (API)
Axios (HTTP requests)
Cheerio (HTML parsing)
```

### Frontend
```
React 18+
Vite
TypeScript
TanStack Table (tabela com ordenação)
Tailwind CSS (estilização)
```

### Dependências Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "axios": "^1.6.7",
    "cheerio": "^1.0.0-rc.12",
    "cors": "^2.8.5",
    "dotenv": "^16.4.1",
    "p-limit": "^5.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.11.16",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  }
}
```

### Dependências Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-table": "^8.11.8"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}
```

---

## 4. Estrutura de Pastas

```
biomedica-leads-sul/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── index.ts              # Configurações e variáveis de ambiente
│   │   ├── db/
│   │   │   ├── schema.sql            # Schema do banco SQLite
│   │   │   ├── connection.ts         # Conexão com o banco
│   │   │   └── repositories/
│   │   │       ├── cities.ts         # CRUD de cidades
│   │   │       ├── establishments.ts # CRUD de estabelecimentos
│   │   │       ├── contacts.ts       # CRUD de contatos
│   │   │       └── searchLog.ts      # Log de buscas
│   │   ├── collectors/
│   │   │   ├── ibge.ts               # Coleta cidades do IBGE
│   │   │   ├── redlara.ts            # Scrape REDLARA
│   │   │   └── serper.ts             # Buscas via Serper API
│   │   ├── enrichment/
│   │   │   └── crawler.ts            # Extrai contatos dos sites
│   │   ├── api/
│   │   │   ├── server.ts             # Express server
│   │   │   └── routes/
│   │   │       ├── establishments.ts # Rotas de estabelecimentos
│   │   │       └── export.ts         # Rota de exportação CSV
│   │   ├── utils/
│   │   │   ├── normalize.ts          # Normalização de strings
│   │   │   ├── dedupe.ts             # Deduplicação
│   │   │   └── delay.ts              # Rate limiting helpers
│   │   ├── pipeline.ts               # Orquestrador da coleta
│   │   └── index.ts                  # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DataTable.tsx         # Tabela principal
│   │   │   ├── Filters.tsx           # Filtros UF/cidade/categoria
│   │   │   ├── SortableHeader.tsx    # Header com ordenação
│   │   │   └── ExportButton.tsx      # Botão exportar CSV
│   │   ├── hooks/
│   │   │   └── useEstablishments.ts  # Hook para buscar dados
│   │   ├── types/
│   │   │   └── index.ts              # Tipos TypeScript
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── data/
│   └── .gitkeep                      # Pasta onde ficará o leads.db
├── scripts/
│   └── run-pipeline.ts               # Script para executar coleta
├── README.md
└── .gitignore
```

---

## 5. Schema do Banco de Dados (SQLite)

```sql
-- backend/src/db/schema.sql

-- Tabela de cidades
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uf TEXT NOT NULL,
    name TEXT NOT NULL,
    ibge_id INTEGER UNIQUE NOT NULL,
    population INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cities_uf ON cities(uf);
CREATE INDEX idx_cities_population ON cities(population);

-- Tabela de estabelecimentos
CREATE TABLE IF NOT EXISTS establishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    city_id INTEGER REFERENCES cities(id),
    category TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lng REAL,
    website TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_establishments_city ON establishments(city_id);
CREATE INDEX idx_establishments_category ON establishments(category);
CREATE INDEX idx_establishments_name_normalized ON establishments(name_normalized);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER REFERENCES establishments(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- phone, email, whatsapp, instagram, facebook, linkedin, website
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(establishment_id, type, value)
);

CREATE INDEX idx_contacts_establishment ON contacts(establishment_id);
CREATE INDEX idx_contacts_type ON contacts(type);

-- Log de buscas realizadas
CREATE TABLE IF NOT EXISTS search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER REFERENCES cities(id),
    keyword TEXT NOT NULL,
    source TEXT NOT NULL, -- serper, redlara, manual
    results_count INTEGER DEFAULT 0,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_log_city ON search_log(city_id);

-- View para exportação
CREATE VIEW IF NOT EXISTS v_establishments_export AS
SELECT 
    e.id,
    c.uf AS estado,
    c.name AS cidade,
    e.name AS nome,
    e.category AS categoria,
    e.address AS endereco,
    e.website AS site,
    e.source AS fonte,
    GROUP_CONCAT(CASE WHEN ct.type = 'phone' THEN ct.value END) AS telefones,
    GROUP_CONCAT(CASE WHEN ct.type = 'email' THEN ct.value END) AS emails,
    GROUP_CONCAT(CASE WHEN ct.type = 'whatsapp' THEN ct.value END) AS whatsapp,
    GROUP_CONCAT(CASE WHEN ct.type = 'instagram' THEN ct.value END) AS instagram,
    GROUP_CONCAT(CASE WHEN ct.type = 'facebook' THEN ct.value END) AS facebook,
    GROUP_CONCAT(CASE WHEN ct.type = 'linkedin' THEN ct.value END) AS linkedin
FROM establishments e
LEFT JOIN cities c ON e.city_id = c.id
LEFT JOIN contacts ct ON e.id = ct.establishment_id
GROUP BY e.id;
```

---

## 6. Configuração de Ambiente

### Arquivo .env.example
```env
# Serper API (free tier: 2500 buscas)
# Cadastre em: https://serper.dev/
SERPER_API_KEY=your_serper_api_key_here

# Configurações de coleta
MIN_POPULATION=30000
RATE_LIMIT_MS=1000
CONCURRENT_REQUESTS=3

# API
API_PORT=3001

# Database
DB_PATH=../data/leads.db
```

---

## 7. Keywords para Busca

```typescript
// backend/src/config/keywords.ts

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
  
  // Hospitais
  'hospital maternidade',
];

export const CATEGORIES = {
  'reprodução humana': 'REPRODUCAO_HUMANA',
  'fertilização': 'REPRODUCAO_HUMANA',
  'FIV': 'REPRODUCAO_HUMANA',
  'reprodução assistida': 'REPRODUCAO_HUMANA',
  'genética': 'LABORATORIO_GENETICA',
  'citogenética': 'LABORATORIO_GENETICA',
  'diagnóstico molecular': 'LABORATORIO_GENETICA',
  'andrologia': 'LABORATORIO_ANDROLOGIA',
  'análises clínicas': 'LABORATORIO_ANALISES',
  'hospital': 'HOSPITAL',
  'maternidade': 'HOSPITAL',
} as const;
```

---

## 8. Implementação por Módulos

### 8.1 Coletor IBGE

```typescript
// backend/src/collectors/ibge.ts

import axios from 'axios';
import { db } from '../db/connection';

interface IBGECity {
  id: number;
  nome: string;
}

interface IBGEPopulation {
  id: number;
  nome: string;
  populacao: number;
}

const UFS = ['RS', 'SC', 'PR'];
const MIN_POPULATION = parseInt(process.env.MIN_POPULATION || '30000');

export async function collectCities(): Promise<void> {
  console.log('🏙️  Coletando cidades do IBGE...');
  
  for (const uf of UFS) {
    console.log(`  📍 Buscando cidades de ${uf}...`);
    
    // Buscar municípios
    const citiesUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    const { data: cities } = await axios.get<IBGECity[]>(citiesUrl);
    
    // Buscar população (estimativa mais recente)
    const popUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[N3[${uf}]]`;
    
    let populationMap = new Map<number, number>();
    
    try {
      const { data: popData } = await axios.get(popUrl);
      // Processar dados de população
      const results = popData[0]?.resultados[0]?.series || [];
      for (const serie of results) {
        const ibgeId = parseInt(serie.localidade.id);
        const pop = parseInt(Object.values(serie.serie)[0] as string) || 0;
        populationMap.set(ibgeId, pop);
      }
    } catch (error) {
      console.warn(`  ⚠️  Não foi possível obter população para ${uf}, usando fallback`);
    }
    
    // Inserir no banco apenas cidades com população >= MIN_POPULATION
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO cities (uf, name, ibge_id, population)
      VALUES (?, ?, ?, ?)
    `);
    
    let count = 0;
    for (const city of cities) {
      const population = populationMap.get(city.id) || 0;
      
      if (population >= MIN_POPULATION) {
        stmt.run(uf, city.nome, city.id, population);
        count++;
      }
    }
    
    console.log(`  ✅ ${count} cidades de ${uf} com pop >= ${MIN_POPULATION}`);
  }
  
  const total = db.prepare('SELECT COUNT(*) as count FROM cities').get() as { count: number };
  console.log(`🏙️  Total: ${total.count} cidades carregadas\n`);
}
```

### 8.2 Coletor REDLARA

```typescript
// backend/src/collectors/redlara.ts

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../db/connection';
import { normalizeString, normalizeCityName } from '../utils/normalize';

const REDLARA_URL = 'https://www.redlara.com/quem_somos.asp?MYPK3=Centros&centro_pais=Brasil';

interface RedlaraCenter {
  name: string;
  city: string | null;
}

export async function collectRedlara(): Promise<void> {
  console.log('🔬 Coletando centros da REDLARA...');
  
  try {
    const { data: html } = await axios.get(REDLARA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(html);
    const centers: RedlaraCenter[] = [];
    
    // Parsear tabela de centros
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const country = $(cells[0]).text().trim();
        const name = $(cells[1]).text().trim();
        
        if (country === 'Brasil' && name) {
          centers.push({ name, city: null });
        }
      }
    });
    
    console.log(`  📋 Encontrados ${centers.length} centros REDLARA no Brasil`);
    
    // Tentar identificar cidade pelo nome ou buscar
    const stmtCity = db.prepare(`
      SELECT id, name, uf FROM cities 
      WHERE uf IN ('RS', 'SC', 'PR')
    `);
    const cities = stmtCity.all() as { id: number; name: string; uf: string }[];
    
    const stmtInsert = db.prepare(`
      INSERT OR IGNORE INTO establishments 
      (name, name_normalized, city_id, category, source, source_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    let inserted = 0;
    for (const center of centers) {
      // Tentar encontrar cidade no nome do centro
      let cityMatch = null;
      for (const city of cities) {
        if (center.name.toLowerCase().includes(city.name.toLowerCase())) {
          cityMatch = city;
          break;
        }
      }
      
      // Só inserir se for do Sul
      if (cityMatch) {
        stmtInsert.run(
          center.name,
          normalizeString(center.name),
          cityMatch.id,
          'REPRODUCAO_HUMANA',
          'redlara',
          REDLARA_URL
        );
        inserted++;
      }
    }
    
    console.log(`  ✅ ${inserted} centros do Sul inseridos\n`);
    
  } catch (error) {
    console.error('  ❌ Erro ao coletar REDLARA:', error);
  }
}
```

### 8.3 Coletor Serper

```typescript
// backend/src/collectors/serper.ts

import axios from 'axios';
import pLimit from 'p-limit';
import { db } from '../db/connection';
import { KEYWORDS, CATEGORIES } from '../config/keywords';
import { normalizeString } from '../utils/normalize';
import { delay } from '../utils/delay';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || '1000');
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '3');

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperResult[];
}

async function searchSerper(query: string): Promise<SerperResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY não configurada');
  }
  
  const response = await axios.post<SerperResponse>(
    'https://google.serper.dev/search',
    { q: query, gl: 'br', hl: 'pt-br', num: 10 },
    {
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.organic || [];
}

function inferCategory(title: string, snippet: string): string {
  const text = `${title} ${snippet}`.toLowerCase();
  
  for (const [keyword, category] of Object.entries(CATEGORIES)) {
    if (text.includes(keyword.toLowerCase())) {
      return category;
    }
  }
  
  return 'OUTROS';
}

export async function collectSerper(): Promise<void> {
  console.log('🔍 Iniciando buscas via Serper...');
  
  const cities = db.prepare(`
    SELECT id, uf, name FROM cities ORDER BY population DESC
  `).all() as { id: number; uf: string; name: string }[];
  
  console.log(`  📍 ${cities.length} cidades para processar`);
  console.log(`  🔑 ${KEYWORDS.length} keywords por cidade`);
  console.log(`  📊 Total estimado: ${cities.length * KEYWORDS.length} buscas\n`);
  
  const limit = pLimit(CONCURRENT_REQUESTS);
  
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
          await delay(RATE_LIMIT_MS);
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
  ];
  
  return irrelevantPatterns.some(pattern => pattern.test(result.link));
}
```

### 8.4 Crawler de Enriquecimento

```typescript
// backend/src/enrichment/crawler.ts

import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { db } from '../db/connection';
import { delay } from '../utils/delay';

const CONCURRENT_CRAWLS = 5;
const CRAWL_TIMEOUT = 10000;
const RATE_LIMIT_MS = 500;

// Regex patterns
const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/g,
  whatsapp: /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[\d\/]+/gi,
  instagram: /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/gi,
  facebook: /facebook\.com\/([a-zA-Z0-9_.]+)/gi,
  linkedin: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/gi,
};

interface ExtractedContacts {
  emails: string[];
  phones: string[];
  whatsapp: string[];
  instagram: string[];
  facebook: string[];
  linkedin: string[];
}

async function extractContactsFromUrl(url: string): Promise<ExtractedContacts> {
  const contacts: ExtractedContacts = {
    emails: [],
    phones: [],
    whatsapp: [],
    instagram: [],
    facebook: [],
    linkedin: [],
  };
  
  try {
    const { data: html } = await axios.get(url, {
      timeout: CRAWL_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      maxRedirects: 3,
    });
    
    const $ = cheerio.load(html);
    
    // Remover scripts e styles
    $('script, style, noscript').remove();
    
    const text = $('body').text();
    const allHrefs = $('a').map((_, el) => $(el).attr('href')).get().join(' ');
    const fullText = `${text} ${allHrefs}`;
    
    // Extrair emails
    const emails = fullText.match(PATTERNS.email) || [];
    contacts.emails = [...new Set(emails)]
      .filter(e => !e.includes('example') && !e.includes('sentry'));
    
    // Extrair telefones
    const phones = fullText.match(PATTERNS.phone) || [];
    contacts.phones = [...new Set(phones)]
      .map(p => p.replace(/\D/g, ''))
      .filter(p => p.length >= 10 && p.length <= 13);
    
    // Extrair WhatsApp
    const whatsapp = fullText.match(PATTERNS.whatsapp) || [];
    contacts.whatsapp = [...new Set(whatsapp)];
    
    // Extrair Instagram
    const instagram = fullText.match(PATTERNS.instagram) || [];
    contacts.instagram = [...new Set(instagram)];
    
    // Extrair Facebook
    const facebook = fullText.match(PATTERNS.facebook) || [];
    contacts.facebook = [...new Set(facebook)];
    
    // Extrair LinkedIn
    const linkedin = fullText.match(PATTERNS.linkedin) || [];
    contacts.linkedin = [...new Set(linkedin)];
    
    // Tentar encontrar página de contato
    const contactLinks = $('a').filter((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      return /contato|contact|fale.?conosco/i.test(href) || 
             /contato|contact|fale conosco/i.test(text);
    });
    
    if (contactLinks.length > 0) {
      const contactHref = $(contactLinks[0]).attr('href');
      if (contactHref && !contactHref.startsWith('mailto:')) {
        const contactUrl = new URL(contactHref, url).href;
        if (contactUrl !== url) {
          await delay(300);
          const extraContacts = await extractContactsFromUrl(contactUrl);
          
          // Merge contacts
          contacts.emails.push(...extraContacts.emails);
          contacts.phones.push(...extraContacts.phones);
          contacts.whatsapp.push(...extraContacts.whatsapp);
          contacts.instagram.push(...extraContacts.instagram);
          contacts.facebook.push(...extraContacts.facebook);
          contacts.linkedin.push(...extraContacts.linkedin);
        }
      }
    }
    
  } catch (error) {
    // Silently fail - muitos sites não respondem
  }
  
  // Deduplicate all
  return {
    emails: [...new Set(contacts.emails)],
    phones: [...new Set(contacts.phones)],
    whatsapp: [...new Set(contacts.whatsapp)],
    instagram: [...new Set(contacts.instagram)],
    facebook: [...new Set(contacts.facebook)],
    linkedin: [...new Set(contacts.linkedin)],
  };
}

export async function enrichEstablishments(): Promise<void> {
  console.log('🌐 Iniciando enriquecimento via crawling...');
  
  const establishments = db.prepare(`
    SELECT e.id, e.website 
    FROM establishments e
    LEFT JOIN contacts c ON e.id = c.establishment_id
    WHERE e.website IS NOT NULL 
      AND e.website != ''
      AND c.id IS NULL
  `).all() as { id: number; website: string }[];
  
  console.log(`  📋 ${establishments.length} sites para processar\n`);
  
  const limit = pLimit(CONCURRENT_CRAWLS);
  
  const stmtInsertContact = db.prepare(`
    INSERT OR IGNORE INTO contacts (establishment_id, type, value)
    VALUES (?, ?, ?)
  `);
  
  let processed = 0;
  let withContacts = 0;
  
  const tasks = establishments.map(est =>
    limit(async () => {
      await delay(RATE_LIMIT_MS);
      
      const contacts = await extractContactsFromUrl(est.website);
      
      let hasContact = false;
      
      // Inserir contatos
      for (const email of contacts.emails.slice(0, 3)) {
        stmtInsertContact.run(est.id, 'email', email);
        hasContact = true;
      }
      
      for (const phone of contacts.phones.slice(0, 3)) {
        stmtInsertContact.run(est.id, 'phone', phone);
        hasContact = true;
      }
      
      for (const wa of contacts.whatsapp.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'whatsapp', wa);
        hasContact = true;
      }
      
      for (const ig of contacts.instagram.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'instagram', ig);
        hasContact = true;
      }
      
      for (const fb of contacts.facebook.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'facebook', fb);
        hasContact = true;
      }
      
      for (const li of contacts.linkedin.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'linkedin', li);
        hasContact = true;
      }
      
      processed++;
      if (hasContact) withContacts++;
      
      process.stdout.write(`\r  🌐 Processados: ${processed}/${establishments.length} | Com contatos: ${withContacts}`);
    })
  );
  
  await Promise.all(tasks);
  
  console.log(`\n  ✅ Enriquecimento finalizado\n`);
}
```

### 8.5 Utilidades

```typescript
// backend/src/utils/normalize.ts

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCityName(name: string): string {
  return normalizeString(name)
    .replace(/\b(de|da|do|das|dos)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

```typescript
// backend/src/utils/delay.ts

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

```typescript
// backend/src/utils/dedupe.ts

import { db } from '../db/connection';

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
    
    db.prepare(`DELETE FROM establishments WHERE id IN (${toRemove.join(',')})`).run();
    removed += toRemove.length;
  }
  
  console.log(`  ✅ ${removed} duplicatas removidas\n`);
}
```

### 8.6 API Backend

```typescript
// backend/src/api/server.ts

import express from 'express';
import cors from 'cors';
import { establishmentsRouter } from './routes/establishments';
import { exportRouter } from './routes/export';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/establishments', establishmentsRouter);
app.use('/api/export', exportRouter);

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const { db } = require('../db/connection');
  
  const total = db.prepare('SELECT COUNT(*) as count FROM establishments').get() as { count: number };
  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM establishments 
    GROUP BY category
  `).all();
  const byUf = db.prepare(`
    SELECT c.uf, COUNT(*) as count 
    FROM establishments e
    JOIN cities c ON e.city_id = c.id
    GROUP BY c.uf
  `).all();
  const withContacts = db.prepare(`
    SELECT COUNT(DISTINCT establishment_id) as count FROM contacts
  `).get() as { count: number };
  
  res.json({
    total: total.count,
    withContacts: withContacts.count,
    byCategory,
    byUf,
  });
});

export function startServer(): void {
  app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
  });
}
```

```typescript
// backend/src/api/routes/establishments.ts

import { Router } from 'express';
import { db } from '../../db/connection';

export const establishmentsRouter = Router();

establishmentsRouter.get('/', (req, res) => {
  const { uf, city, category, search } = req.query;
  
  let query = `
    SELECT 
      e.id,
      c.uf as estado,
      c.name as cidade,
      e.name as nome,
      e.category as categoria,
      e.address as endereco,
      e.website as site,
      e.source as fonte,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'phone') as telefones,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'email') as emails,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'whatsapp') as whatsapp,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'instagram') as instagram,
      (SELECT GROUP_CONCAT(value, ', ') FROM contacts WHERE establishment_id = e.id AND type = 'facebook') as facebook
    FROM establishments e
    JOIN cities c ON e.city_id = c.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (uf) {
    query += ` AND c.uf = ?`;
    params.push(uf);
  }
  
  if (city) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${city}%`);
  }
  
  if (category) {
    query += ` AND e.category = ?`;
    params.push(category);
  }
  
  if (search) {
    query += ` AND (e.name LIKE ? OR c.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ` ORDER BY c.uf, c.name, e.name`;
  
  const results = db.prepare(query).all(...params);
  
  res.json(results);
});

establishmentsRouter.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT category FROM establishments ORDER BY category
  `).all();
  
  res.json(categories.map((c: any) => c.category));
});

establishmentsRouter.get('/cities', (req, res) => {
  const { uf } = req.query;
  
  let query = `
    SELECT DISTINCT c.name, c.uf
    FROM cities c
    JOIN establishments e ON e.city_id = c.id
  `;
  
  if (uf) {
    query += ` WHERE c.uf = ?`;
    const cities = db.prepare(query).all(uf);
    res.json(cities);
  } else {
    query += ` ORDER BY c.uf, c.name`;
    const cities = db.prepare(query).all();
    res.json(cities);
  }
});
```

```typescript
// backend/src/api/routes/export.ts

import { Router } from 'express';
import { db } from '../../db/connection';

export const exportRouter = Router();

exportRouter.get('/csv', (req, res) => {
  const { uf, city, category } = req.query;
  
  let query = `SELECT * FROM v_establishments_export WHERE 1=1`;
  const params: any[] = [];
  
  if (uf) {
    query += ` AND estado = ?`;
    params.push(uf);
  }
  
  if (city) {
    query += ` AND cidade LIKE ?`;
    params.push(`%${city}%`);
  }
  
  if (category) {
    query += ` AND categoria = ?`;
    params.push(category);
  }
  
  const results = db.prepare(query).all(...params) as any[];
  
  // Gerar CSV
  const headers = [
    'ID', 'Estado', 'Cidade', 'Nome', 'Categoria', 'Endereco', 
    'Site', 'Fonte', 'Telefones', 'Emails', 'WhatsApp', 'Instagram', 'Facebook', 'LinkedIn'
  ];
  
  const csvLines = [
    headers.join(';'),
    ...results.map(row => [
      row.id,
      row.estado,
      row.cidade,
      `"${(row.nome || '').replace(/"/g, '""')}"`,
      row.categoria,
      `"${(row.endereco || '').replace(/"/g, '""')}"`,
      row.site || '',
      row.fonte || '',
      `"${(row.telefones || '').replace(/"/g, '""')}"`,
      `"${(row.emails || '').replace(/"/g, '""')}"`,
      `"${(row.whatsapp || '').replace(/"/g, '""')}"`,
      `"${(row.instagram || '').replace(/"/g, '""')}"`,
      `"${(row.facebook || '').replace(/"/g, '""')}"`,
      `"${(row.linkedin || '').replace(/"/g, '""')}"`,
    ].join(';'))
  ];
  
  const csv = csvLines.join('\n');
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leads-biomedica-sul.csv');
  res.send('\uFEFF' + csv); // BOM para Excel reconhecer UTF-8
});
```

### 8.7 Pipeline Principal

```typescript
// backend/src/pipeline.ts

import { collectCities } from './collectors/ibge';
import { collectRedlara } from './collectors/redlara';
import { collectSerper } from './collectors/serper';
import { enrichEstablishments } from './enrichment/crawler';
import { deduplicateEstablishments } from './utils/dedupe';
import { initDatabase } from './db/connection';

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
```

### 8.8 Entry Points

```typescript
// backend/src/index.ts

import 'dotenv/config';
import { startServer } from './api/server';
import { initDatabase } from './db/connection';

// Inicializar banco e servidor
initDatabase();
startServer();
```

```typescript
// scripts/run-pipeline.ts

import 'dotenv/config';
import { runPipeline } from '../backend/src/pipeline';

runPipeline()
  .then(() => {
    console.log('Pipeline finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro no pipeline:', error);
    process.exit(1);
  });
```

---

## 9. Frontend

### 9.1 Tipos

```typescript
// frontend/src/types/index.ts

export interface Establishment {
  id: number;
  estado: string;
  cidade: string;
  nome: string;
  categoria: string;
  endereco: string | null;
  site: string | null;
  fonte: string;
  telefones: string | null;
  emails: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
}

export interface Stats {
  total: number;
  withContacts: number;
  byCategory: { category: string; count: number }[];
  byUf: { uf: string; count: number }[];
}

export interface Filters {
  uf: string;
  city: string;
  category: string;
  search: string;
}
```

### 9.2 Hook de Dados

```typescript
// frontend/src/hooks/useEstablishments.ts

import { useState, useEffect } from 'react';
import type { Establishment, Stats, Filters } from '../types';

const API_URL = 'http://localhost:3001/api';

export function useEstablishments(filters: Filters) {
  const [data, setData] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.uf) params.set('uf', filters.uf);
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);

    setLoading(true);
    fetch(`${API_URL}/establishments?${params}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters.uf, filters.city, filters.category, filters.search]);

  return { data, loading, error };
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return stats;
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/establishments/categories`)
      .then(res => res.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  return categories;
}

export function useCities(uf?: string) {
  const [cities, setCities] = useState<{ name: string; uf: string }[]>([]);

  useEffect(() => {
    const params = uf ? `?uf=${uf}` : '';
    fetch(`${API_URL}/establishments/cities${params}`)
      .then(res => res.json())
      .then(setCities)
      .catch(console.error);
  }, [uf]);

  return cities;
}
```

### 9.3 Componentes

```tsx
// frontend/src/components/Filters.tsx

import { useCategories, useCities } from '../hooks/useEstablishments';
import type { Filters } from '../types';

interface FiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function Filters({ filters, onChange }: FiltersProps) {
  const categories = useCategories();
  const cities = useCities(filters.uf || undefined);

  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select
          value={filters.uf}
          onChange={(e) => onChange({ ...filters, uf: e.target.value, city: '' })}
          className="px-3 py-2 border rounded-md min-w-[120px]"
        >
          <option value="">Todos</option>
          <option value="RS">RS</option>
          <option value="SC">SC</option>
          <option value="PR">PR</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Cidade</label>
        <select
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          className="px-3 py-2 border rounded-md min-w-[180px]"
        >
          <option value="">Todas</option>
          {cities.map((c) => (
            <option key={`${c.uf}-${c.name}`} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Categoria</label>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="px-3 py-2 border rounded-md min-w-[200px]"
        >
          <option value="">Todas</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Buscar</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Nome ou cidade..."
          className="px-3 py-2 border rounded-md min-w-[200px]"
        />
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/components/DataTable.tsx

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import type { Establishment } from '../types';

interface DataTableProps {
  data: Establishment[];
}

export function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Establishment>[]>(
    () => [
      { accessorKey: 'estado', header: 'UF', size: 60 },
      { accessorKey: 'cidade', header: 'Cidade', size: 150 },
      { accessorKey: 'nome', header: 'Nome', size: 250 },
      { 
        accessorKey: 'categoria', 
        header: 'Categoria',
        cell: ({ getValue }) => (getValue() as string).replace(/_/g, ' '),
        size: 150
      },
      { 
        accessorKey: 'telefones', 
        header: 'Telefones',
        size: 150,
        cell: ({ getValue }) => getValue() || '-'
      },
      { 
        accessorKey: 'emails', 
        header: 'Emails',
        size: 200,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          return (
            <a href={`mailto:${value.split(',')[0]}`} className="text-blue-600 hover:underline">
              {value}
            </a>
          );
        }
      },
      { 
        accessorKey: 'site', 
        header: 'Site',
        size: 100,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          return (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Acessar
            </a>
          );
        }
      },
      { 
        accessorKey: 'instagram', 
        header: 'Instagram',
        size: 120,
        cell: ({ getValue }) => getValue() || '-'
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: header.getSize() }}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? ''}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// frontend/src/components/ExportButton.tsx

import type { Filters } from '../types';

interface ExportButtonProps {
  filters: Filters;
}

export function ExportButton({ filters }: ExportButtonProps) {
  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.uf) params.set('uf', filters.uf);
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    
    window.open(`http://localhost:3001/api/export/csv?${params}`, '_blank');
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Exportar CSV
    </button>
  );
}
```

### 9.4 App Principal

```tsx
// frontend/src/App.tsx

import { useState } from 'react';
import { DataTable } from './components/DataTable';
import { Filters as FiltersComponent } from './components/Filters';
import { ExportButton } from './components/ExportButton';
import { useEstablishments, useStats } from './hooks/useEstablishments';
import type { Filters } from './types';

function App() {
  const [filters, setFilters] = useState<Filters>({
    uf: '',
    city: '',
    category: '',
    search: '',
  });

  const { data, loading, error } = useEstablishments(filters);
  const stats = useStats();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Leads para Estágio em Biomedicina - Sul do Brasil
          </h1>
          {stats && (
            <p className="text-sm text-gray-600 mt-1">
              {stats.total} estabelecimentos | {stats.withContacts} com contatos
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-start mb-4">
          <FiltersComponent filters={filters} onChange={setFilters} />
          <ExportButton filters={filters} />
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando dados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            Erro ao carregar dados: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {data.length} resultados encontrados
            </p>
            <DataTable data={data} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
```

---

## 10. Instruções de Execução

### 10.1 Setup Inicial

```bash
# 1. Criar estrutura do projeto
mkdir biomedica-leads-sul
cd biomedica-leads-sul

# 2. Criar pastas
mkdir -p backend/src/{config,db/repositories,collectors,enrichment,api/routes,utils}
mkdir -p frontend/src/{components,hooks,types}
mkdir -p data scripts

# 3. Inicializar projetos
cd backend && npm init -y && cd ..
cd frontend && npm create vite@latest . -- --template react-ts && cd ..
```

### 10.2 Instalar Dependências

```bash
# Backend
cd backend
npm install express better-sqlite3 axios cheerio cors dotenv p-limit zod
npm install -D @types/better-sqlite3 @types/express @types/cors @types/node typescript tsx

# Frontend
cd ../frontend
npm install @tanstack/react-table
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 10.3 Configurar Ambiente

```bash
# Criar .env no backend
cd ../backend
cp .env.example .env
# Editar .env e adicionar SERPER_API_KEY
```

### 10.4 Executar Pipeline de Coleta

```bash
# Na raiz do projeto
npx tsx scripts/run-pipeline.ts

# Isso vai:
# 1. Criar o banco SQLite em data/leads.db
# 2. Coletar cidades do IBGE
# 3. Scrape REDLARA
# 4. Buscar via Serper
# 5. Crawlear sites para contatos
# 6. Deduplicar
```

### 10.5 Iniciar Aplicação

```bash
# Terminal 1 - Backend
cd backend
npx tsx src/index.ts

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 10.6 Acessar

- Frontend: http://localhost:5173
- API: http://localhost:3001

---

## 11. Checklist de Implementação

- [ ] Criar estrutura de pastas
- [ ] Configurar package.json (backend e frontend)
- [ ] Configurar TypeScript
- [ ] Criar schema SQLite
- [ ] Implementar conexão com banco
- [ ] Implementar coletor IBGE
- [ ] Implementar coletor REDLARA
- [ ] Implementar coletor Serper
- [ ] Implementar crawler de enriquecimento
- [ ] Implementar deduplicação
- [ ] Implementar pipeline orquestrador
- [ ] Implementar API Express
- [ ] Implementar rota de exportação CSV
- [ ] Configurar Tailwind no frontend
- [ ] Implementar hook useEstablishments
- [ ] Implementar componente Filters
- [ ] Implementar componente DataTable
- [ ] Implementar componente ExportButton
- [ ] Implementar App.tsx
- [ ] Testar fluxo completo
- [ ] Documentar README

---

## 12. Observações Importantes

1. **Serper API Key**: Cadastrar em https://serper.dev/ para obter key gratuita (2.500 buscas)

2. **Tempo de execução**: O pipeline completo deve levar entre 30-60 minutos dependendo da velocidade da internet

3. **Rate limiting**: O código já inclui delays para evitar bloqueios. Não alterar os valores sem necessidade

4. **Banco SQLite**: O arquivo `data/leads.db` pode ser aberto com qualquer cliente SQLite (DB Browser, DBeaver, etc.)

5. **Exportação**: O CSV usa ponto-e-vírgula como separador para compatibilidade com Excel brasileiro

6. **Crawling**: Alguns sites podem bloquear ou não responder. O código trata esses casos silenciosamente

7. **Categorias**: A classificação automática é baseada em palavras-chave. Pode haver incorreções que precisam ser corrigidas manualmente

---

## 13. Possíveis Melhorias Futuras

- Adicionar mais fontes (SBRA, CRM, CRBM)
- Implementar score de "chance de aceitar estágio"
- Adicionar geração de mensagens personalizadas
- Implementar atualização incremental
- Adicionar autenticação no frontend
- Deploy em servidor para acesso remoto
