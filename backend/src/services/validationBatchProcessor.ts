import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { OpenAIService } from './openai.js';
import type { ValidationBatchStatus, ValidationBatchJob } from '../types/validation.js';

interface BatchQueue {
  batchId: string;
  establishmentIds: number[];
  jobs: ValidationBatchJob[];
}

class ValidationBatchProcessor {
  private static instance: ValidationBatchProcessor;
  private queues: Map<string, BatchQueue> = new Map();
  private processing = false;
  private openaiService: OpenAIService;
  private db: Database.Database;

  private constructor() {
    this.openaiService = new OpenAIService();
    const dbPath = process.env.DB_PATH || '../data/leads.db';
    this.db = new Database(dbPath);
  }

  static getInstance(): ValidationBatchProcessor {
    if (!ValidationBatchProcessor.instance) {
      ValidationBatchProcessor.instance = new ValidationBatchProcessor();
    }
    return ValidationBatchProcessor.instance;
  }

  async createBatch(establishmentIds: number[]): Promise<string> {
    const batchId = uuidv4();

    // Create batch record
    this.db.prepare(`
      INSERT INTO validation_batches (id, total, status)
      VALUES (?, ?, 'processing')
    `).run(batchId, establishmentIds.length);

    // Create jobs
    const jobs: ValidationBatchJob[] = establishmentIds.map(id => ({
      batchId,
      establishmentId: id,
      status: 'pending',
    }));

    this.queues.set(batchId, { batchId, establishmentIds, jobs });
    this.processQueue();

    return batchId;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    for (const [batchId, queue] of this.queues.entries()) {
      for (let i = 0; i < queue.jobs.length; i++) {
        const job = queue.jobs[i];
        if (job.status !== 'pending') continue;

        job.status = 'processing';

        try {
          // Get establishment data
          const establishment = this.db.prepare(`
            SELECT id, name, category, website, address
            FROM establishments
            WHERE id = ?
          `).get(job.establishmentId) as any;

          if (!establishment) {
            job.status = 'failed';
            job.error = 'Estabelecimento não encontrado';
            continue;
          }

          // Validate with OpenAI
          const result = await this.openaiService.validateEstablishment({
            name: establishment.name,
            category: establishment.category,
            website: establishment.website,
            address: establishment.address,
          });

          job.result = result;

          // Update establishment
          const newStatus = result.isValid ? 'validated' : 'flagged';
          this.db.prepare(`
            UPDATE establishments
            SET validation_status = ?,
                validation_reason = ?,
                validation_confidence = ?,
                validated_at = datetime('now')
            WHERE id = ?
          `).run(newStatus, result.reason, result.confidence, establishment.id);

          job.status = 'completed';

          // Update batch counters
          const field = result.isValid ? 'validated' : 'flagged';
          this.db.prepare(`
            UPDATE validation_batches
            SET completed = completed + 1,
                ${field} = ${field} + 1
            WHERE id = ?
          `).run(batchId);

        } catch (error) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : 'Erro desconhecido';

          this.db.prepare(`
            UPDATE validation_batches
            SET completed = completed + 1,
                failed = failed + 1
            WHERE id = ?
          `).run(batchId);
        }

        // Rate limiting: 30 seconds between calls
        if (i < queue.jobs.length - 1) {
          await this.delay(30000);
        }
      }

      // Mark batch as completed
      this.db.prepare(`
        UPDATE validation_batches
        SET status = 'completed',
            completed_at = datetime('now')
        WHERE id = ?
      `).run(batchId);

      this.queues.delete(batchId);
    }

    this.processing = false;
  }

  getBatchStatus(batchId: string): ValidationBatchStatus | null {
    const batch = this.db.prepare(`
      SELECT * FROM validation_batches WHERE id = ?
    `).get(batchId) as any;

    if (!batch) return null;

    const queue = this.queues.get(batchId);
    const jobs = queue?.jobs || [];

    return {
      batchId: batch.id,
      total: batch.total,
      completed: batch.completed,
      validated: batch.validated,
      flagged: batch.flagged,
      failed: batch.failed,
      status: batch.status,
      jobs,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const validationBatchProcessor = ValidationBatchProcessor.getInstance();
