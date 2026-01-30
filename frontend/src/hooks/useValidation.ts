import { useMutation, useQuery } from '@tanstack/react-query';
import type { ValidationBatchStatus, ValidationStats } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useStartValidationBatch() {
  return useMutation({
    mutationFn: async (establishmentIds?: number[]) => {
      const res = await fetch(`${API_URL}/api/validation/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentIds }),
      });
      if (!res.ok) throw new Error('Erro ao iniciar validação');
      return res.json();
    },
  });
}

export function useValidationBatchStatus(batchId: string | null) {
  return useQuery<ValidationBatchStatus | null>({
    queryKey: ['validationBatch', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const res = await fetch(`${API_URL}/api/validation/batch/${batchId}`);
      if (!res.ok) throw new Error('Erro ao buscar status');
      return res.json();
    },
    enabled: !!batchId,
    refetchInterval: (data) => {
      // Poll every 5s while processing
      if (data && data.status === 'processing') return 5000;
      return false;
    },
  });
}

export function useValidationStats() {
  return useQuery<ValidationStats>({
    queryKey: ['validationStats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/validation/stats`);
      if (!res.ok) throw new Error('Erro ao buscar estatísticas');
      return res.json();
    },
  });
}

export function useManualOverride() {
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason
    }: {
      id: number;
      status: 'manual_approved' | 'manual_rejected';
      reason?: string;
    }) => {
      const res = await fetch(`${API_URL}/api/validation/${id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) throw new Error('Erro ao sobrescrever validação');
      return res.json();
    },
  });
}
