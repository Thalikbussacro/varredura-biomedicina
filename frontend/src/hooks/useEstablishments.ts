import { useState, useEffect } from 'react';
import type { Establishment, Stats, Filters } from '../types';

const API_URL = 'http://localhost:3001/api';

/**
 * Hook para buscar estabelecimentos com filtros
 */
export function useEstablishments(filters: Filters) {
  const [data, setData] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.uf) params.set('uf', filters.uf);
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);

    setLoading(true);
    fetch(`${API_URL}/establishments?${params}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters.uf, filters.city, filters.category, filters.search]);

  return { data, loading, error };
}

/**
 * Hook para buscar estatísticas
 */
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return stats;
}

/**
 * Hook para buscar categorias
 */
export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/establishments/categories`)
      .then(res => res.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  return categories;
}

/**
 * Hook para buscar cidades (opcionalmente filtradas por UF)
 */
export function useCities(uf?: string) {
  const [cities, setCities] = useState<{ name: string; uf: string }[]>([]);

  useEffect(() => {
    const params = uf ? `?uf=${uf}` : '';
    fetch(`${API_URL}/establishments/cities${params}`)
      .then(res => res.json())
      .then(setCities)
      .catch(console.error);
  }, [uf]);

  return cities;
}
