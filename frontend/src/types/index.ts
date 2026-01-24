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
}
