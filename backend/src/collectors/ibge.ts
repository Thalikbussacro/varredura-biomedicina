import axios from 'axios';
import { db } from '../db/connection.js';
import { UFS, CONFIG } from '../config/index.js';

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
 * Filtra apenas cidades com população >= MIN_POPULATION
 */
export async function collectCities(): Promise<void> {
  console.log('🏙️  Coletando cidades do IBGE...');

  for (const uf of UFS) {
    console.log(`  📍 Buscando cidades de ${uf}...`);

    // Buscar municípios
    const citiesUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    const { data: cities } = await axios.get<IBGECity[]>(citiesUrl);

    // Buscar população (estimativa mais recente)
    const popUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[N3[${uf}]]`;

    const populationMap = new Map<number, number>();

    try {
      const { data: popData } = await axios.get<IBGEPopulationResult[]>(popUrl);
      // Processar dados de população
      const results = popData[0]?.resultados[0]?.series || [];
      for (const serie of results) {
        const ibgeId = parseInt(serie.localidade.id);
        const popValue = Object.values(serie.serie)[0];
        const pop = parseInt(popValue) || 0;
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

      if (population >= CONFIG.MIN_POPULATION) {
        stmt.run(uf, city.nome, city.id, population);
        count++;
      }
    }

    console.log(`  ✅ ${count} cidades de ${uf} com pop >= ${CONFIG.MIN_POPULATION.toLocaleString()}`);
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM cities').get() as { count: number };
  console.log(`🏙️  Total: ${total.count} cidades carregadas\n`);
}
