const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = [
    {
      name: 'Fashion',
      description: 'Clothing, shoes, and accessories',
      fields: [
        {
          name: 'size',
          label: 'Size',
          type: 'select',
          required: true,
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'],
          defaultValue: 'M',
        },
        {
          name: 'color',
          label: 'Color',
          type: 'text',
          required: true,
          placeholder: 'Ex: Midnight Blue',
        },
        {
          name: 'material',
          label: 'Material',
          type: 'text',
          required: false,
          placeholder: 'Ex: 100% Cotton',
        },
      ],
    },
    {
      name: 'Electronics',
      description: 'Gadgets, devices, and tech accessories',
      fields: [
        {
          name: 'brand',
          label: 'Brand',
          type: 'text',
          required: true,
          placeholder: 'Ex: Apple, Samsung',
        },
        {
          name: 'model',
          label: 'Model Name/Number',
          type: 'text',
          required: true,
          placeholder: 'Ex: iPhone 15 Pro',
        },
        {
          name: 'condition',
          label: 'Condition',
          type: 'select',
          required: true,
          options: ['New', 'Refurbished', 'Used - Like New', 'Used - Good'],
          defaultValue: 'New',
        },
        {
          name: 'warranty',
          label: 'Warranty Period',
          type: 'text',
          required: false,
          placeholder: 'Ex: 1 Year',
        },
      ],
    },
    {
      name: 'Home & Kitchen',
      description: 'Furniture, appliances, and decor',
      fields: [
        {
          name: 'dimensions',
          label: 'Dimensions',
          type: 'text',
          required: false,
          placeholder: 'Ex: 120x60x75 cm',
        },
        {
          name: 'weight',
          label: 'Weight (kg)',
          type: 'number',
          required: false,
          placeholder: '0.0',
        },
      ],
    },
  ];

  console.log('Seeding categories...');

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
        fields: cat.fields,
      },
      create: {
        name: cat.name,
        description: cat.description,
        fields: cat.fields,
      },
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
