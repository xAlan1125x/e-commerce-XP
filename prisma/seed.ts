import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/security/credentials';

const prisma = new PrismaClient();

/**
 * Crea (o actualiza) el usuario ADMIN inicial. El rol ADMIN nunca se asigna vía
 * /api/auth/register para evitar escalación de privilegios: se otorga acá o mediante
 * un administrador ya autenticado.
 */
async function main() {
  const clienteId = process.env.SEED_ADMIN_CLIENTE_ID ?? 'admin';
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@estudio.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin#12345';

  const passwordHash = hashPassword(password);
  await prisma.usuario.upsert({
    where: { email },
    update: { password: passwordHash, rol: 'ADMIN', twoFactorEnabled: false },
    create: { clienteId, email, password: passwordHash, rol: 'ADMIN', twoFactorEnabled: false }
  });

  console.log(`Usuario administrador listo -> email: ${email} / clienteId: ${clienteId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
