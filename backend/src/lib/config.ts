import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET?.trim();
const isTest = process.env.NODE_ENV === 'test';

if (!jwtSecret || (!isTest && jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET é obrigatório e deve ter pelo menos 32 caracteres fora do ambiente de testes.');
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret,
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME?.trim() || '',
};
