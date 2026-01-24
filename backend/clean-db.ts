import { db } from './src/db/connection.js';

console.log('🧹 Limpando banco de dados...');

// Deletar contatos e estabelecimentos (manter cidades)
db.prepare('DELETE FROM contacts').run();
db.prepare('DELETE FROM establishments').run();
db.prepare('DELETE FROM search_log').run();

console.log('✅ Banco limpo! Cidades mantidas.');

const cities = db.prepare('SELECT COUNT(*) as count FROM cities').get() as { count: number };
console.log(`   ${cities.count} cidades preservadas`);

db.close();
