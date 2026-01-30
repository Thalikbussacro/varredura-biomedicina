import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || '../data/leads.db';
const db = new Database(dbPath);

console.log('Running migrations...');

// Check if columns already exist
const tableInfo = db.prepare('PRAGMA table_info(establishments)').all();
const hasValidationStatus = tableInfo.some(col => col.name === 'validation_status');

if (!hasValidationStatus) {
  console.log('Adding validation columns to establishments...');

  try {
    db.exec('ALTER TABLE establishments ADD COLUMN validation_status TEXT DEFAULT \'pending\'');
    console.log('✅ Added validation_status column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.error('❌ Error adding validation_status:', error.message);
    }
  }

  try {
    db.exec('ALTER TABLE establishments ADD COLUMN validation_reason TEXT');
    console.log('✅ Added validation_reason column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.error('❌ Error adding validation_reason:', error.message);
    }
  }

  try {
    db.exec('ALTER TABLE establishments ADD COLUMN validation_confidence REAL');
    console.log('✅ Added validation_confidence column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.error('❌ Error adding validation_confidence:', error.message);
    }
  }

  try {
    db.exec('ALTER TABLE establishments ADD COLUMN validated_at DATETIME');
    console.log('✅ Added validated_at column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.error('❌ Error adding validated_at:', error.message);
    }
  }

  // Create index
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_establishments_validation_status ON establishments(validation_status)');
    console.log('✅ Created validation_status index');
  } catch (error) {
    console.error('❌ Error creating index:', error.message);
  }
} else {
  console.log('ℹ️  Validation columns already exist');
}

// Create validation_batches table
const batchTableExists = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='validation_batches'
`).get();

if (!batchTableExists) {
  console.log('Creating validation_batches table...');

  try {
    db.exec(`
      CREATE TABLE validation_batches (
        id TEXT PRIMARY KEY,
        total INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        validated INTEGER NOT NULL DEFAULT 0,
        flagged INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        status TEXT NOT NULL DEFAULT 'processing'
      )
    `);
    console.log('✅ Created validation_batches table');

    db.exec('CREATE INDEX IF NOT EXISTS idx_validation_batches_status ON validation_batches(status)');
    console.log('✅ Created validation_batches status index');
  } catch (error) {
    console.error('❌ Error creating validation_batches:', error.message);
  }
} else {
  console.log('ℹ️  validation_batches table already exists');
}

console.log('\n✅ Migration completed!');

// Final verification
const finalCheck = db.prepare('PRAGMA table_info(establishments)').all();
const hasAll = finalCheck.some(col => col.name === 'validation_status');

if (hasAll) {
  console.log('✅ All validation columns verified');
} else {
  console.log('❌ Validation columns not found');
}

const finalBatchCheck = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='validation_batches'
`).get();

if (finalBatchCheck) {
  console.log('✅ validation_batches table verified');
} else {
  console.log('❌ validation_batches table not found');
}

db.close();
