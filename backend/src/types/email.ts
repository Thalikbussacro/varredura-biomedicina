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
  id: number;
  gmail_refresh_token: string | null;
  gmail_access_token: string | null;
  gmail_token_expiry: string | null;
  user_email: string | null;
  updated_at: string;
}

export interface EmailGenerationParams {
  establishmentName: string;
  category: string;
  city: string;
  uf: string;
}

export interface GeneratedEmailContent {
  subject: string;
  body: string;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  accessToken: string;
  refreshToken: string;
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
