export type ValidationStatus = 'pending' | 'validated' | 'flagged' | 'manual_approved' | 'manual_rejected';

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  confidence: number; // 0-1
}

export interface EstablishmentValidationParams {
  name: string;
  category: string;
  website: string | null;
  address: string | null;
}

export interface ValidationBatchJob {
  batchId: string;
  establishmentId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: ValidationResult;
}

export interface ValidationBatchStatus {
  batchId: string;
  total: number;
  completed: number;
  validated: number;
  flagged: number;
  failed: number;
  status: 'processing' | 'completed' | 'failed';
  jobs: ValidationBatchJob[];
}
