import type Database from 'better-sqlite3';

/**
 * Registra a função HAVERSINE no SQLite
 * Calcula a distância em quilômetros entre dois pontos geográficos
 */
export function registerHaversineFunction(db: Database.Database): void {
  db.function('HAVERSINE', { deterministic: true }, (lat1: number, lng1: number, lat2: number, lng2: number) => {
    // Se algum valor for NULL, retornar NULL
    if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
      return null;
    }

    const R = 6371; // Raio médio da Terra em km

    // Converter graus para radianos
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

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

    return R * c; // Retorna distância em km (não arredondada, o SQL pode fazer isso)
  });
}
