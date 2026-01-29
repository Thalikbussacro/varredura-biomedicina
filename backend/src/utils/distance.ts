/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
 * Retorna a distância em quilômetros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio médio da Terra em km

  // Converter graus para radianos
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  // Fórmula de Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.asin(Math.sqrt(a));

  const distance = R * c;

  return Math.round(distance); // Retorna distância arredondada em km
}

/**
 * Converte graus para radianos
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
