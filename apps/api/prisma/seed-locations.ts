import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function slugify(country: string, region: string, city: string): string {
  return `${country}-${region}-${city}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const GHANA_LOCATIONS: Record<string, string[]> = {
  'Greater Accra': [
    'Accra', 'Tema', 'Madina', 'Ashaiman', 'Teshie', 'Nungua',
    'Kasoa', 'Dansoman', 'Achimota', 'Adenta', 'Dome', 'East Legon',
    'Spintex', 'Cantonments', 'Osu', 'Labadi', 'La', 'Airport Residential',
  ],
  'Ashanti': [
    'Kumasi', 'Obuasi', 'Ejisu', 'Konongo', 'Mampong', 'Bekwai',
    'Agogo', 'Mankranso', 'Juaso', 'Offinso', 'Asante Akyem',
  ],
  'Western': [
    'Takoradi', 'Sekondi', 'Tarkwa', 'Axim', 'Prestea', 'Elubo',
    'Agona Nkwanta', 'Sefwi Wiawso',
  ],
  'Central': [
    'Cape Coast', 'Elmina', 'Mankessim', 'Kasoa', 'Winneba',
    'Swedru', 'Dunkwa-on-Offin', 'Assin Fosu',
  ],
  'Eastern': [
    'Koforidua', 'Nkawkaw', 'Suhum', 'Nsawam', 'Akosombo',
    'Akim Oda', 'Kibi', 'Aburi', 'Kade', 'Donkorkrom',
  ],
  'Volta': [
    'Ho', 'Hohoe', 'Keta', 'Anloga', 'Kpando', 'Amedzofe',
    'Sogakope', 'Aflao',
  ],
  'Oti': [
    'Dambai', 'Nkwanta', 'Kadjebi', 'Jasikan', 'Kpassa',
  ],
  'Northern': [
    'Tamale', 'Yendi', 'Savelugu', 'Bimbilla', 'Salaga', 'Damongo',
  ],
  'Savannah': [
    'Damongo', 'Bole', 'Sawla', 'Salaga',
  ],
  'North East': [
    'Nalerigu', 'Gambaga', 'Walewale', 'Chereponi',
  ],
  'Upper East': [
    'Bolgatanga', 'Navrongo', 'Bawku', 'Zebilla', 'Paga',
  ],
  'Upper West': [
    'Wa', 'Tumu', 'Nandom', 'Lawra', 'Jirapa',
  ],
  'Bono': [
    'Sunyani', 'Berekum', 'Dormaa Ahenkro', 'Techiman',
  ],
  'Bono East': [
    'Techiman', 'Kintampo', 'Atebubu', 'Nkoranza', 'Yeji',
  ],
  'Ahafo': [
    'Goaso', 'Bechem', 'Duayaw Nkwanta', 'Kukuom',
  ],
  'Western North': [
    'Sefwi Wiawso', 'Bibiani', 'Juaboso', 'Enchi', 'Akontombra',
  ],
};

async function seedLocations() {
  console.log('🌍 Seeding Ghana locations...');

  const locations: { country: string; region: string; city: string; slug: string }[] = [];

  for (const [region, cities] of Object.entries(GHANA_LOCATIONS)) {
    for (const city of cities) {
      const slug = slugify('Ghana', region, city);
      locations.push({
        country: 'Ghana',
        region,
        city,
        slug,
      });
    }
  }

  // Use upsert to avoid duplicates
  let created = 0;
  let skipped = 0;
  for (const loc of locations) {
    try {
      await prisma.location.upsert({
        where: { slug: loc.slug },
        update: {},
        create: loc,
      });
      created++;
    } catch (e) {
      // If slug check missed it but group check would hit it, or vice versa
      console.warn(`⚠️  Skipping duplicate or invalid location: ${loc.city}, ${loc.region}`);
      skipped++;
    }
  }

  console.log(`✅ Seeded ${created} locations. Skipped ${skipped}.`);
}

seedLocations()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
