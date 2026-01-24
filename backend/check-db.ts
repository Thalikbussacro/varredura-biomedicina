import Database from 'better-sqlite3';

const db = new Database('../data/leads.db', { readonly: true });

const cities = db.prepare('SELECT COUNT(*) as count FROM cities').get() as { count: number };
const establishments = db.prepare('SELECT COUNT(*) as count FROM establishments').get() as { count: number };
const contacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };

console.log(`🏙️  Cidades: ${cities.count}`);
console.log(`🏢 Estabelecimentos: ${establishments.count}`);
console.log(`📞 Contatos: ${contacts.count}`);

db.close();
