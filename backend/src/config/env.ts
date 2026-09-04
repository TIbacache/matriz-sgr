import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno faltante: ${name}`);
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  // RNF-017: dónde viven las evidencias. Fuera del repositorio, por tenant.
  evidenciasDir: process.env.EVIDENCIAS_DIR ?? "almacenamiento/evidencias",
  // Tope DURO de infraestructura para el cuerpo de una subida. NO es el límite
  // de negocio: ese sale del parámetro `evidencia_tamano_max_mb` (ADR-007).
  // Este solo evita que un cuerpo enorme llegue siquiera a memoria.
  limiteSubidaHttp: process.env.LIMITE_SUBIDA_HTTP ?? "25mb",
};
