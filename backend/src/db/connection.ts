import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerHaversineFunction } from './functions/haversine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do banco de dados
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../../data/leads.db');

// Criar diretório data/ se não existir
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Criar conexão com o banco
export const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Registrar funções customizadas
registerHaversineFunction(db);

// Função para inicializar o banco
export function initDatabase(): void {
  console.log('📦 Inicializando banco de dados...');
  console.log(`   Caminho: ${DB_PATH}\n`);

  // Ler e executar schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Executar cada statement do schema
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error: any) {
      // Ignorar erros de "já existe" (tabelas/índices/views já criados)
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        continue;
      }
      console.error('Erro ao executar statement:', statement);
      throw error;
    }
  }

  console.log('✅ Banco de dados inicializado com sucesso!\n');
}

// Função para fechar a conexão (útil para cleanup)
export function closeDatabase(): void {
  db.close();
}

// Auto-executar ao importar em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'test') {
  // Não inicializar automaticamente - deixar para o código chamar explicitamente
}
