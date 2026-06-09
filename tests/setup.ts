import { resolve } from 'path';

// Carga .env del proyecto (si existe) para que DATABASE_URL y demás estén disponibles.
// En CI las variables vienen del job env y process.loadEnvFile las respeta (no sobreescribe).
try {
  process.loadEnvFile(resolve(process.cwd(), '.env'));
} catch {
  // .env no encontrado — se usan las variables ya presentes (entorno CI)
}

// Clave de prueba AES-256: 32 bytes de ceros codificados en base64.
// Solo para tests; nunca usar en producción.
// Sobreescribimos siempre para que los tests usen una clave determinística.
process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
