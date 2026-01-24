import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../db/connection.js';
import { normalizeString } from '../utils/normalize.js';

const REDLARA_URL = 'https://www.redlara.com/quem_somos.asp?MYPK3=Centros&centro_pais=Brasil';

interface RedlaraCenter {
  name: string;
  city: string | null;
}

interface City {
  id: number;
  name: string;
  uf: string;
}

/**
 * Coleta centros de reprodução humana da REDLARA
 * Tenta identificar a cidade pelo nome do centro
 */
export async function collectRedlara(): Promise<void> {
  console.log('🔬 Coletando centros da REDLARA...');

  try {
    const { data: html } = await axios.get(REDLARA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
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
    const cities = stmtCity.all() as City[];

    const stmtInsert = db.prepare(`
      INSERT OR IGNORE INTO establishments
      (name, name_normalized, city_id, category, source, source_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    for (const center of centers) {
      // Tentar encontrar cidade no nome do centro
      let cityMatch: City | null = null;
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

  } catch (error: any) {
    console.error('  ❌ Erro ao coletar REDLARA:', error.message);
  }
}
