import { randomUUID } from 'crypto';
import type { BatchJob, BatchStatus } from '../types/email.js';

export class EmailBatchProcessor {
  private batches: Map<string, BatchStatus> = new Map();
  private queue: BatchJob[] = [];
  private isProcessing = false;
  private processCallback?: (job: BatchJob) => Promise<void>;

  setProcessCallback(callback: (job: BatchJob) => Promise<void>): void {
    this.processCallback = callback;
  }

  async createBatch(establishmentIds: number[]): Promise<string> {
    const batchId = randomUUID();

    const jobs: BatchJob[] = establishmentIds.map((id) => ({
      batchId,
      establishmentId: id,
      status: 'pending',
    }));

    const batchStatus: BatchStatus = {
      batchId,
      total: jobs.length,
      completed: 0,
      failed: 0,
      pending: jobs.length,
      jobs,
    };

    this.batches.set(batchId, batchStatus);
    this.queue.push(...jobs);

    this.processQueue();

    return batchId;
  }

  getBatchStatus(batchId: string): BatchStatus | undefined {
    return this.batches.get(batchId);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      const batch = this.batches.get(job.batchId);
      if (!batch) continue;

      job.status = 'processing';
      this.updateBatchStatus(job);

      try {
        if (this.processCallback) {
          await this.processCallback(job);
        }

        job.status = 'completed';
        batch.completed++;
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Erro desconhecido';
        batch.failed++;
      }

      batch.pending--;
      this.updateBatchStatus(job);

      await this.delay(30000);
    }

    this.isProcessing = false;
  }

  private updateBatchStatus(job: BatchJob): void {
    const batch = this.batches.get(job.batchId);
    if (!batch) return;

    const jobIndex = batch.jobs.findIndex(
      (j) => j.establishmentId === job.establishmentId
    );

    if (jobIndex !== -1) {
      batch.jobs[jobIndex] = job;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearBatch(batchId: string): void {
    this.batches.delete(batchId);
  }

  getAllBatches(): BatchStatus[] {
    return Array.from(this.batches.values());
  }
}

export const emailBatchProcessor = new EmailBatchProcessor();
