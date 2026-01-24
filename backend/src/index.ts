import 'dotenv/config';
import { startServer } from './api/server.js';
import { initDatabase } from './db/connection.js';

// Inicializar banco de dados
initDatabase();

// Iniciar servidor API
startServer();
