#!/usr/bin/env tsx

import { db } from '../db/connection.js';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

/**
 * Importa coordenadas de todos os municípios brasileiros
 * Fonte: https://github.com/kelvins/Municipios-Brasileiros
 */

interface MunicipioCSV {
  codigo_ibge: string;
  nome: string;
  latitude: string;
  longitude: string;
  capital: string;
  codigo_uf: string;
  siafi_id: string;
  ddd: string;
  fuso_horario: string;
}

async function importCoordinates() {
  console.log('📍 Importando coordenadas dos municípios...\n');

  try {
    // Baixar CSV do GitHub
    console.log('  📥 Baixando dataset de municípios brasileiros...');
    const csvUrl = 'https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/csv/municipios.csv';
    const response = await axios.get(csvUrl);
    const csvData = response.data;

    // Parse CSV
    console.log('  📋 Processando CSV...');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
    }) as MunicipioCSV[];

    console.log(`  ✅ ${records.length} municípios encontrados no dataset\n`);

    // Verificar quantas cidades existem no banco
    const cities = db.prepare(`
      SELECT id, ibge_id, name, uf FROM cities
    `).all() as { id: number; ibge_id: number; name: string; uf: string }[];

    console.log(`  🏙️  ${cities.length} cidades no banco de dados\n`);

    // Atualizar coordenadas
    const stmtUpdate = db.prepare(`
      UPDATE cities SET lat = ?, lng = ? WHERE ibge_id = ?
    `);

    let updated = 0;
    let notFound = 0;

    for (const city of cities) {
      const municipio = records.find(r => parseInt(r.codigo_ibge) === city.ibge_id);

      if (municipio) {
        const lat = parseFloat(municipio.latitude);
        const lng = parseFloat(municipio.longitude);

        stmtUpdate.run(lat, lng, city.ibge_id);
        updated++;

        // Log especial para Joaçaba
        if (city.ibge_id === 4209003) {
          console.log(`  🎯 Joaçaba-SC encontrada: lat=${lat}, lng=${lng}`);
        }
      } else {
        notFound++;
        console.log(`  ⚠️  Coordenadas não encontradas: ${city.name}-${city.uf} (IBGE: ${city.ibge_id})`);
      }
    }

    console.log(`\n  ✅ Importação concluída!`);
    console.log(`     ${updated} cidades atualizadas`);
    console.log(`     ${notFound} cidades sem coordenadas`);

    // Verificar Joaçaba especificamente
    const joacaba = db.prepare(`
      SELECT name, uf, lat, lng, ibge_id FROM cities WHERE ibge_id = 4209003
    `).get() as { name: string; uf: string; lat: number; lng: number; ibge_id: number } | undefined;

    if (joacaba) {
      console.log(`\n  📍 Verificação - Joaçaba-SC:`);
      console.log(`     Nome: ${joacaba.name}`);
      console.log(`     UF: ${joacaba.uf}`);
      console.log(`     Latitude: ${joacaba.lat}`);
      console.log(`     Longitude: ${joacaba.lng}`);
      console.log(`     IBGE: ${joacaba.ibge_id}`);

      // Verificar se está próximo das coordenadas esperadas
      const expectedLat = -27.1721;
      const expectedLng = -51.5108;
      const latDiff = Math.abs(joacaba.lat - expectedLat);
      const lngDiff = Math.abs(joacaba.lng - expectedLng);

      if (latDiff < 0.01 && lngDiff < 0.01) {
        console.log(`     ✅ Coordenadas corretas!`);
      } else {
        console.log(`     ⚠️  Coordenadas diferem do esperado:`);
        console.log(`        Esperado: ${expectedLat}, ${expectedLng}`);
      }
    } else {
      console.log(`\n  ⚠️  Joaçaba não encontrada no banco de dados`);
      console.log(`     Isso pode acontecer se a cidade não atende aos critérios:`);
      console.log(`     - População mínima (${process.env.MIN_POPULATION || '30,000'} habitantes)`);
      console.log(`     - Ter pelo menos 1 estabelecimento cadastrado`);
    }

  } catch (error: any) {
    console.error('  ❌ Erro na importação:', error.message);
    throw error;
  }
}

// Executar
importCoordinates()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
