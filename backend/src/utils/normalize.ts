/**
 * Normaliza uma string removendo acentos, caracteres especiais e convertendo para minúsculas
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza nome de cidade removendo preposições comuns
 */
export function normalizeCityName(name: string): string {
  return normalizeString(name)
    .replace(/\b(de|da|do|das|dos)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
