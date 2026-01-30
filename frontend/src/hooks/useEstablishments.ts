import { useState, useEffect, useMemo } from 'react';
import type { Establishment, Stats, Filters } from '../types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const USE_STATIC_DATA = import.meta.env.VITE_USE_STATIC_DATA === 'true';

// Cache global dos dados (carrega uma única vez)
let cachedData: Establishment[] | null = null;
let loadingPromise: Promise<Establishment[]> | null = null;
export let usingStaticData = USE_STATIC_DATA;

/**
 * Carrega os dados - tenta API primeiro, fallback para JSON se falhar
 */
async function loadData(): Promise<Establishment[]> {
  if (cachedData) {
    return cachedData;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    // Se configurado para usar dados estáticos, pula tentativa da API
    if (USE_STATIC_DATA) {
      console.log('📦 Usando dados estáticos (JSON)');
      const res = await fetch('/data.json');
      const data = await res.json();
      cachedData = data;
      usingStaticData = true;
      return data;
    }

    // Tenta carregar da API primeiro
    try {
      console.log('🌐 Tentando carregar dados da API...');
      const res = await fetch(`${API_URL}/establishments`, {
        signal: AbortSignal.timeout(5000) // Timeout de 5s
      });

      if (!res.ok) throw new Error('API response not OK');

      const data = await res.json();
      cachedData = data;
      usingStaticData = false;
      console.log('✅ Dados carregados da API');
      return data;
    } catch (error) {
      // Fallback para JSON local
      console.log('⚠️ API não disponível, usando dados estáticos (JSON)');
      const res = await fetch('/data.json');
      const data = await res.json();
      cachedData = data;
      usingStaticData = true;
      return data;
    }
  })();

  loadingPromise.finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

/**
 * Normaliza string para busca (remove acentos, lowercase)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Hook para buscar estabelecimentos com filtros
 * - Se API disponível: faz request com filtros
 * - Se modo estático: carrega tudo e filtra client-side
 */
export function useEstablishments(filters: Filters) {
  const [allData, setAllData] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    loadData()
      .then(data => {
        setAllData(data);
        setIsStatic(usingStaticData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Aplicar filtros client-side (quando usando dados estáticos)
  const data = useMemo(() => {
    if (!isStatic) {
      // Se não é estático, precisa refazer request com filtros
      // Por enquanto retorna tudo (vamos lidar com isso no próximo useEffect)
      return allData;
    }

    // Filtragem client-side para modo estático
    return allData.filter(item => {
      // Filtro por UF
      if (filters.uf && item.estado !== filters.uf) return false;

      // Filtro por cidade
      if (filters.city && item.cidade !== filters.city) return false;

      // Filtro por categoria
      if (filters.category && item.categoria !== filters.category) return false;

      // Filtro por busca textual
      if (filters.search) {
        const searchNorm = normalize(filters.search);
        const nomeNorm = normalize(item.nome);
        const cidadeNorm = normalize(item.cidade);

        if (!nomeNorm.includes(searchNorm) && !cidadeNorm.includes(searchNorm)) {
          return false;
        }
      }

      return true;
    });
  }, [allData, filters, isStatic]);

  // Se está usando API (não estático), refaz request quando filtros mudam
  useEffect(() => {
    if (!isStatic) {
      const params = new URLSearchParams();
      if (filters.uf) params.set('uf', filters.uf);
      if (filters.city) params.set('city', filters.city);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);

      // Filtro de validação
      if (filters.validationFilter === 'all') {
        params.set('includeInvalidated', 'true');
      } else if (filters.validationFilter === 'pending') {
        params.set('includeInvalidated', 'true');
        params.set('validationStatus', 'pending');
      } else if (filters.validationFilter === 'flagged') {
        params.set('includeInvalidated', 'true');
        params.set('validationStatus', 'flagged');
      }
      // Para 'validated', não adiciona nada (comportamento padrão)

      setLoading(true);
      fetch(`${API_URL}/establishments?${params}`)
        .then(res => res.json())
        .then(setAllData)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [filters.uf, filters.city, filters.category, filters.search, filters.validationFilter, isStatic]);

  return { data, loading, error };
}

/**
 * Hook para buscar estatísticas
 * - Se API disponível: busca do endpoint /stats
 * - Se modo estático: calcula client-side
 */
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [data, setData] = useState<Establishment[]>([]);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    loadData()
      .then(data => {
        setData(data);
        setIsStatic(usingStaticData);

        // Se não for estático, tenta buscar stats da API
        if (!usingStaticData) {
          fetch(`${API_URL}/stats`)
            .then(res => res.json())
            .then(setStats)
            .catch(() => {
              // Se API falhar, calcula client-side
              setIsStatic(true);
            });
        }
      })
      .catch(console.error);
  }, []);

  // Calcular stats client-side quando em modo estático
  const calculatedStats = useMemo((): Stats | null => {
    if (!isStatic || data.length === 0) return null;

    const withContacts = data.filter(
      item => item.telefones || item.emails || item.whatsapp
    ).length;

    // Contar por categoria
    const byCategory: Record<string, number> = {};
    data.forEach(item => {
      byCategory[item.categoria] = (byCategory[item.categoria] || 0) + 1;
    });

    // Contar por UF
    const byUf: Record<string, number> = {};
    data.forEach(item => {
      byUf[item.estado] = (byUf[item.estado] || 0) + 1;
    });

    return {
      total: data.length,
      withContacts,
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      byUf: Object.entries(byUf).map(([uf, count]) => ({ uf, count })),
    };
  }, [data, isStatic]);

  return isStatic ? calculatedStats : stats;
}

/**
 * Hook para buscar categorias
 * - Se API disponível: busca do endpoint
 * - Se modo estático: extrai dos dados
 */
export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [data, setData] = useState<Establishment[]>([]);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    loadData()
      .then(data => {
        setData(data);
        setIsStatic(usingStaticData);

        // Se não for estático, tenta buscar da API
        if (!usingStaticData) {
          fetch(`${API_URL}/establishments/categories`)
            .then(res => res.json())
            .then(setCategories)
            .catch(() => {
              setIsStatic(true);
            });
        }
      })
      .catch(console.error);
  }, []);

  // Calcular categorias client-side quando em modo estático
  const calculatedCategories = useMemo(() => {
    if (!isStatic) return [];
    const unique = new Set(data.map(item => item.categoria));
    return Array.from(unique).sort();
  }, [data, isStatic]);

  return isStatic ? calculatedCategories : categories;
}

/**
 * Hook para buscar cidades (opcionalmente filtradas por UF)
 * - Se API disponível: busca do endpoint
 * - Se modo estático: extrai dos dados
 */
export function useCities(uf?: string) {
  const [cities, setCities] = useState<{ name: string; uf: string }[]>([]);
  const [data, setData] = useState<Establishment[]>([]);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    loadData()
      .then(data => {
        setData(data);
        setIsStatic(usingStaticData);

        // Se não for estático, tenta buscar da API
        if (!usingStaticData) {
          const params = uf ? `?uf=${uf}` : '';
          fetch(`${API_URL}/establishments/cities${params}`)
            .then(res => res.json())
            .then(setCities)
            .catch(() => {
              setIsStatic(true);
            });
        }
      })
      .catch(console.error);
  }, [uf]);

  // Calcular cidades client-side quando em modo estático
  const calculatedCities = useMemo(() => {
    if (!isStatic) return [];

    const filtered = uf ? data.filter(item => item.estado === uf) : data;

    const cityMap = new Map<string, { name: string; uf: string }>();
    filtered.forEach(item => {
      const key = `${item.estado}-${item.cidade}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, { name: item.cidade, uf: item.estado });
      }
    });

    return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, uf, isStatic]);

  return isStatic ? calculatedCities : cities;
}
