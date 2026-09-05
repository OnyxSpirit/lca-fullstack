import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable d'environnement obligatoire absente: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} doit être un entier positif`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: positiveInteger('PORT', 3001),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  db: {
    host: required('DB_HOST'), port: positiveInteger('DB_PORT', 3306), user: required('DB_USER'),
    password: process.env.DB_PASSWORD ?? '', database: required('DB_NAME'), poolSize: positiveInteger('DB_POOL_SIZE', 10),
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'), refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m', refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
};

if (env.jwt.accessSecret.length < 32 || env.jwt.refreshSecret.length < 32) throw new Error('Les secrets JWT doivent contenir au moins 32 caractères');
