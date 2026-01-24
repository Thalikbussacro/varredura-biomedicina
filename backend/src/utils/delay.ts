/**
 * Aguarda um determinado tempo (útil para rate limiting)
 * @param ms Tempo em milissegundos
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
