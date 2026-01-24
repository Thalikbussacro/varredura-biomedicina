import axios from 'axios';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/connection.js';
import { UFS, CONFIG } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface IBGECity {
  id: number;
  nome: string;
}

interface IBGEPopulationSerie {
  localidade: {
    id: string;
  };
  serie: Record<string, string>;
}

interface IBGEPopulationResult {
  resultados: Array<{
    series: IBGEPopulationSerie[];
  }>;
}

/**
 * Coleta cidades do IBGE para os estados do Sul do Brasil
 * Como a API de população do IBGE é instável, usamos uma lista das principais cidades (30k+)
 * baseada em dados do Censo 2022
 */
export async function collectCities(): Promise<void> {
  console.log('🏙️  Coletando cidades do IBGE...');

  for (const uf of UFS) {
    console.log(`  📍 Buscando cidades de ${uf}...`);

    // Buscar municípios
    const citiesUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    const { data: cities } = await axios.get<IBGECity[]>(citiesUrl);

    // Tentar buscar população via API
    const popUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[N3[${uf}]]`;
    const populationMap = new Map<number, number>();

    try {
      const { data: popData } = await axios.get(popUrl, { timeout: 10000 });

      // A API retorna um array com resultados
      if (Array.isArray(popData) && popData.length > 0) {
        const resultados = popData[0]?.resultados;
        if (Array.isArray(resultados) && resultados.length > 0) {
          const series = resultados[0]?.series || [];
          for (const serie of series) {
            const ibgeId = parseInt(serie.localidade.id);
            const popValue = Object.values(serie.serie)[0];
            const pop = parseInt(popValue) || 0;
            populationMap.set(ibgeId, pop);
          }
        }
      }
    } catch (error) {
      console.warn(`  ⚠️  API de população indisponível para ${uf}, usando dados de fallback`);

      // Carregar dados de fallback
      try {
        const fallbackPath = join(__dirname, '../data/cities-population.json');
        if (existsSync(fallbackPath)) {
          const fallbackData = JSON.parse(readFileSync(fallbackPath, 'utf-8')) as Record<string, Record<string, { name: string; pop: number }>>;

          const ufData = fallbackData[uf] || {};
          for (const [ibgeId, cityData] of Object.entries(ufData)) {
            populationMap.set(parseInt(ibgeId), cityData.pop);
          }

          console.log(`  ℹ️  Carregados ${populationMap.size} registros do fallback`);
        } else {
          console.warn(`  ⚠️  Arquivo de fallback não encontrado: ${fallbackPath}`);
        }
      } catch (fallbackError) {
        console.warn(`  ⚠️  Erro ao carregar fallback, inserindo todas as cidades`);
      }
    }

    // Inserir no banco
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO cities (uf, name, ibge_id, population)
      VALUES (?, ?, ?, ?)
    `);

    let count = 0;
    for (const city of cities) {
      const population = populationMap.get(city.id) || 0;

      // Se conseguimos dados de população, filtramos por MIN_POPULATION
      // Senão, inserimos todas e deixamos o usuário filtrar depois
      if (populationMap.size === 0 || population >= CONFIG.MIN_POPULATION) {
        stmt.run(uf, city.nome, city.id, population);
        count++;
      }
    }

    if (populationMap.size > 0) {
      console.log(`  ✅ ${count} cidades de ${uf} com pop >= ${CONFIG.MIN_POPULATION.toLocaleString()}`);
    } else {
      console.log(`  ✅ ${count} cidades de ${uf} carregadas (população desconhecida)`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM cities').get() as { count: number };
  console.log(`🏙️  Total: ${total.count} cidades carregadas\n`);
}
