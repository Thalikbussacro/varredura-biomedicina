export interface Establishment {
  id: number;
  estado: string;
  cidade: string;
  nome: string;
  categoria: string;
  endereco: string | null;
  site: string | null;
  fonte: string;
  telefones: string | null;
  emails: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  distancia_km: number | null;
  validation_status: 'pending' | 'validated' | 'flagged' | 'manual_approved' | 'manual_rejected';
  validation_reason: string | null;
  validation_confidence: number | null;
}

export interface Stats {
  total: number;
  withContacts: number;
  byCategory: { category: string; count: number }[];
  byUf: { uf: string; count: number }[];
}

export interface Filters {
  uf: string;
  city: string;
  category: string;
  search: string;
  onlyWithPhone: boolean;
  onlyWithEmail: boolean;
  validationFilter: 'all' | 'validated' | 'pending' | 'flagged';
}

export interface ConnectionStatus {
  isOnline: boolean;
  apiUrl: string;
  mode: 'api' | 'static';
  isConfigured: boolean;
}

export interface GeneratedEmail {
  id: number;
  establishment_id: number;
  subject: string;
  body: string;
  recipient_email: string;
  status: 'draft' | 'sent' | 'failed';
  generated_at: string;
  sent_at: string | null;
  error_message: string | null;
}

export interface EmailConfig {
  openai: {
    configured: boolean;
  };
  gmail: {
    clientConfigured: boolean;
    authenticated: boolean;
    userEmail: string | null;
    tokenExpiry: string | null;
  };
}

export interface BatchJob {
  batchId: string;
  establishmentId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface BatchStatus {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  jobs: BatchJob[];
}

export interface ValidationBatchJob {
  batchId: string;
  establishmentId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
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

export interface ValidationStats {
  total: number;
  byStatus: Record<string, number>;
}
