import bcrypt from 'bcryptjs';
import { config } from '../lib/config';
import { prisma } from '../lib/prisma';

export async function provisionAdminFromEnvironment() {
  const email = config.adminEmail;
  const password = config.adminPassword;
  if (!email) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    }
    return;
  }

  if (!password || password.length < 12) {
    throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres para criar a conta administrativa.');
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name: config.adminName || 'Administrador',
      email,
      password: hash,
      role: 'ADMIN',
    },
  });
}
