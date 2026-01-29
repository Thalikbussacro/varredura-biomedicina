import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GeneratedEmail, EmailConfig, BatchStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useEmailConfig() {
  return useQuery<EmailConfig>({
    queryKey: ['email-config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/config/status`);
      if (!res.ok) throw new Error('Falha ao buscar configuração');
      return res.json();
    },
  });
}

export function useGeneratedEmail(establishmentId: number) {
  return useQuery<GeneratedEmail | null>({
    queryKey: ['generated-email', establishmentId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/emails/${establishmentId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Falha ao buscar e-mail');
      return res.json();
    },
    enabled: !!establishmentId,
  });
}

export function useGenerateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishmentId: number) => {
      const res = await fetch(`${API_URL}/emails/generate/${establishmentId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Falha ao gerar e-mail');
      return res.json();
    },
    onSuccess: (data, establishmentId) => {
      queryClient.invalidateQueries({ queryKey: ['generated-email', establishmentId] });
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: number) => {
      const res = await fetch(`${API_URL}/emails/send/${emailId}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Falha ao enviar e-mail');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['generated-email', data.establishment_id]
      });
    },
  });
}

export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: number) => {
      const res = await fetch(`${API_URL}/emails/${emailId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao deletar e-mail');
      return res.json();
    },
    onSuccess: (_, emailId) => {
      queryClient.invalidateQueries({ queryKey: ['generated-email'] });
    },
  });
}

export function useSendBatch() {
  return useMutation({
    mutationFn: async (establishmentIds: number[]) => {
      const res = await fetch(`${API_URL}/emails/send-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ establishmentIds }),
      });
      if (!res.ok) throw new Error('Falha ao criar batch');
      return res.json() as Promise<{ batchId: string }>;
    },
  });
}

export function useBatchStatus(batchId: string | null) {
  return useQuery<BatchStatus | null>({
    queryKey: ['batch-status', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const res = await fetch(`${API_URL}/emails/batch-status/${batchId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Falha ao buscar status do batch');
      return res.json();
    },
    enabled: !!batchId,
    refetchInterval: 5000,
  });
}

export function useInitiateGmailAuth() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/config/gmail/auth`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Falha ao iniciar autenticação');
      const data = await res.json();
      window.open(data.authUrl, '_blank', 'width=600,height=700');
    },
  });
}
