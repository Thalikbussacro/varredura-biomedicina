import { useState, useEffect } from 'react';
import { API_URL, USE_STATIC_DATA, usingStaticData } from './useEstablishments';
import type { ConnectionStatus } from '../types';

/**
 * Hook para obter o status da conexão (API vs Fallback)
 * Retorna informações sobre se está usando a API ou dados estáticos
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: !USE_STATIC_DATA,
    apiUrl: API_URL,
    mode: USE_STATIC_DATA ? 'static' : 'api',
    isConfigured: USE_STATIC_DATA,
  });

  useEffect(() => {
    // Pequeno delay para garantir que loadData() foi chamado
    const timer = setTimeout(() => {
      setStatus({
        isOnline: !usingStaticData,
        apiUrl: API_URL,
        mode: usingStaticData ? 'static' : 'api',
        isConfigured: USE_STATIC_DATA,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return status;
}
