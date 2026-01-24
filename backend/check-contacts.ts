import Database from 'better-sqlite3';

const db = new Database('../data/leads.db', { readonly: true });

const total = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };
const emails = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE type = ?').get('email') as { count: number };
const phones = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE type = ?').get('phone') as { count: number };
const instagram = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE type = ?').get('instagram') as { count: number };
const whatsapp = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE type = ?').get('whatsapp') as { count: number };
const facebook = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE type = ?').get('facebook') as { count: number };

console.log('📊 Contatos no banco:');
console.log(`   Total: ${total.count}`);
console.log(`   📧 Emails: ${emails.count}`);
console.log(`   📞 Telefones: ${phones.count}`);
console.log(`   💬 WhatsApp: ${whatsapp.count}`);
console.log(`   📷 Instagram: ${instagram.count}`);
console.log(`   👍 Facebook: ${facebook.count}`);

db.close();
