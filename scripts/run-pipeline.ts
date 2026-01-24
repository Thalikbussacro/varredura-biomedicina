import 'dotenv/config';
import { runPipeline } from '../backend/src/pipeline.js';

runPipeline()
  .then(() => {
    console.log('✅ Pipeline finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no pipeline:', error);
    process.exit(1);
  });
