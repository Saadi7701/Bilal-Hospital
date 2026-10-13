import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[MRN Seeder] Checking MrnCounter table...');

  // Check if singleton row already exists
  const existing = await prisma.mrnCounter.findUnique({
    where: { id: 'singleton' }
  });

  if (existing) {
    console.log(`[MRN Seeder] Singleton row already exists: lastMrn = ${existing.lastMrn}`);
    console.log('[MRN Seeder] No action needed.');
  } else {
    console.log('[MRN Seeder] Singleton row not found. Creating with lastMrn = 1014...');
    const row = await prisma.mrnCounter.create({
      data: {
        id: 'singleton',
        lastMrn: 1014,
      }
    });
    console.log(`[MRN Seeder] Created: id=${row.id}, lastMrn=${row.lastMrn}`);
    console.log('[MRN Seeder] Next patient registration will receive MR-2026-1015');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('[MRN Seeder ERROR]:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
