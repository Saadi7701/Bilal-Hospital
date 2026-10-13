import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.patient.count();
  const patients = await prisma.patient.findMany({
    select: { mrNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log('TOTAL PATIENTS:', count);
  console.log('\nALL MRNs (oldest first):');
  patients.forEach(p => console.log(' ', JSON.stringify(p.mrNumber), '|', p.createdAt.toISOString().split('T')[0]));

  // Detect format groups
  const formats = { numeric: [], yrFormat: [], timestampBased: [], other: [] };
  patients.forEach(p => {
    const mrn = p.mrNumber;
    if (/^\d+$/.test(mrn)) formats.numeric.push(mrn);
    else if (/^MR-\d{4}-\d+$/.test(mrn)) formats.yrFormat.push(mrn);
    else if (/^MR-\d{10,}/.test(mrn)) formats.timestampBased.push(mrn);
    else formats.other.push(mrn);
  });

  console.log('\nFORMAT BREAKDOWN:');
  console.log('  Pure numeric (e.g. "125"):', formats.numeric.length);
  console.log('  MR-YYYY-NNNN format:', formats.yrFormat.length);
  console.log('  Timestamp-based (MR-timestamp):', formats.timestampBased.length);
  console.log('  Other:', formats.other.length, formats.other.slice(0, 5));

  // Find max numeric suffix across all formats
  const allNumericSuffixes = patients
    .map(p => { const m = p.mrNumber.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; });
  const maxSuffix = Math.max(...allNumericSuffixes, 0);
  console.log('\nMAX numeric suffix found:', maxSuffix);
  console.log('Recommended sequence START value:', Math.max(maxSuffix, count) + 1);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
