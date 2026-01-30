import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH || '../data/leads.db';
const db = new Database(dbPath);

console.log('Setting all establishments to pending validation status...');

const result = db.prepare(`
  UPDATE establishments
  SET validation_status = 'pending'
  WHERE validation_status IS NULL OR validation_status = ''
`).run();

console.log(`✅ Updated ${result.changes} establishments to 'pending' status`);

// Verify
const stats = db.prepare(`
  SELECT validation_status, COUNT(*) as count
  FROM establishments
  GROUP BY validation_status
`).all();

console.log('\nCurrent status distribution:');
stats.forEach(s => {
  console.log(`  ${s.validation_status || 'NULL'}: ${s.count}`);
});

db.close();
