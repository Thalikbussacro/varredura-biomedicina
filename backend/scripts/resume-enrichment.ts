import 'dotenv/config';
import { enrichEstablishments } from '../src/enrichment/crawler.js';

console.log('🔄 Retomando enriquecimento de estabelecimentos...\n');

enrichEstablishments()
  .then(() => {
    console.log('\n✅ Enriquecimento finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no enriquecimento:', error);
    process.exit(1);
  });
