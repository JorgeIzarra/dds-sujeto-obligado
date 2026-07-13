import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos...');

  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash('password123', salt);

  // Limpiar oficiales anteriores si existen
  await prisma.oficial.deleteMany({
    where: {
      email: { in: ['oficial@dds.test', 'supervisor@dds.test'] }
    }
  });

  // Crear oficial
  const oficial = await prisma.oficial.create({
    data: {
      nombre: 'Ana Oficial López',
      cargo: 'OFICIAL',
      email: 'oficial@dds.test',
      hashPassword,
    }
  });

  // Crear supervisor
  const supervisor = await prisma.oficial.create({
    data: {
      nombre: 'Carlos Supervisor Gómez',
      cargo: 'SUPERVISOR',
      email: 'supervisor@dds.test',
      hashPassword,
    }
  });

  console.log('Base de datos sembrada con éxito:');
  console.log(`- Oficial: ${oficial.email} (Contraseña: password123)`);
  console.log(`- Supervisor: ${supervisor.email} (Contraseña: password123)`);
}

main()
  .catch((e) => {
    console.error('Error al sembrar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
