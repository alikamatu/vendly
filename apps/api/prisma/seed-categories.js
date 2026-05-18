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
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'One Size', 'Custom'],
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
        {
          name: 'gender',
          label: 'Target Gender',
          type: 'select',
          required: false,
          options: ['Unisex', 'Men', 'Women', 'Boys', 'Girls'],
          defaultValue: 'Unisex',
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
          options: ['Brand New', 'Refurbished', 'Used – Like New', 'Used – Good'],
          defaultValue: 'Brand New',
        },
        {
          name: 'warranty',
          label: 'Warranty Period',
          type: 'text',
          required: false,
          placeholder: 'Ex: 1 Year, 6 Months, None',
        },
        {
          name: 'storage',
          label: 'Storage / Capacity',
          type: 'text',
          required: false,
          placeholder: 'Ex: 256GB, 8GB RAM',
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
          placeholder: 'Ex: 120×60×75 cm',
        },
        {
          name: 'weight',
          label: 'Weight (kg)',
          type: 'number',
          required: false,
          placeholder: '0.0',
        },
        {
          name: 'material',
          label: 'Material',
          type: 'text',
          required: false,
          placeholder: 'Ex: Stainless Steel, Wood',
        },
        {
          name: 'room_type',
          label: 'Room Type',
          type: 'select',
          required: false,
          options: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Office', 'Outdoor', 'Any'],
          defaultValue: 'Any',
        },
      ],
    },
    {
      name: 'Beauty & Personal Care',
      description: 'Skincare, makeup, hair care, and grooming products',
      fields: [
        {
          name: 'skin_type',
          label: 'Skin / Hair Type',
          type: 'select',
          required: false,
          options: ['All Types', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'],
          defaultValue: 'All Types',
        },
        {
          name: 'product_type',
          label: 'Product Type',
          type: 'select',
          required: true,
          options: ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Grooming', 'Body Care', 'Nail Care', 'Other'],
          defaultValue: 'Skincare',
        },
        {
          name: 'volume_weight',
          label: 'Volume / Weight',
          type: 'text',
          required: false,
          placeholder: 'Ex: 100ml, 50g',
        },
        {
          name: 'expiry',
          label: 'Expiry / Shelf Life',
          type: 'text',
          required: false,
          placeholder: 'Ex: 12 months after opening',
        },
      ],
    },
    {
      name: 'Sports & Outdoors',
      description: 'Sports equipment, fitness gear, and outdoor adventure',
      fields: [
        {
          name: 'sport_type',
          label: 'Sport / Activity',
          type: 'text',
          required: true,
          placeholder: 'Ex: Football, Cycling, Gym, Hiking',
        },
        {
          name: 'size',
          label: 'Size / Dimensions',
          type: 'text',
          required: false,
          placeholder: 'Ex: Size 5, L, 26-inch',
        },
        {
          name: 'material',
          label: 'Material',
          type: 'text',
          required: false,
          placeholder: 'Ex: Carbon Fiber, Neoprene',
        },
      ],
    },
    {
      name: 'Food & Beverages',
      description: 'Fresh produce, packaged foods, snacks, and drinks',
      fields: [
        {
          name: 'food_type',
          label: 'Food Category',
          type: 'select',
          required: true,
          options: ['Fresh Produce', 'Packaged / Processed', 'Snacks', 'Beverages', 'Spices & Condiments', 'Baked Goods', 'Frozen Foods', 'Other'],
          defaultValue: 'Packaged / Processed',
        },
        {
          name: 'quantity_unit',
          label: 'Unit of Measure',
          type: 'text',
          required: false,
          placeholder: 'Ex: per kg, per bag, per bottle',
        },
        {
          name: 'expiry',
          label: 'Expiry / Best Before',
          type: 'text',
          required: false,
          placeholder: 'Ex: 6 months, see packaging',
        },
        {
          name: 'dietary_info',
          label: 'Dietary Info',
          type: 'text',
          required: false,
          placeholder: 'Ex: Vegan, Gluten-Free, Halal',
        },
      ],
    },
    {
      name: 'Books & Stationery',
      description: 'Books, journals, office & school supplies',
      fields: [
        {
          name: 'item_type',
          label: 'Item Type',
          type: 'select',
          required: true,
          options: ['Book', 'Textbook', 'Journal / Notebook', 'Office Supplies', 'Art Supplies', 'Other'],
          defaultValue: 'Book',
        },
        {
          name: 'author',
          label: 'Author / Brand',
          type: 'text',
          required: false,
          placeholder: 'Ex: Chinua Achebe',
        },
        {
          name: 'isbn',
          label: 'ISBN / Edition',
          type: 'text',
          required: false,
          placeholder: 'Ex: 978-0-00-000000-0',
        },
        {
          name: 'language',
          label: 'Language',
          type: 'text',
          required: false,
          placeholder: 'Ex: English',
        },
      ],
    },
    {
      name: 'Toys & Games',
      description: 'Toys, board games, and entertainment for all ages',
      fields: [
        {
          name: 'age_range',
          label: 'Age Range',
          type: 'select',
          required: true,
          options: ['0–2 years', '3–5 years', '6–8 years', '9–12 years', '13+ years', 'All Ages'],
          defaultValue: 'All Ages',
        },
        {
          name: 'toy_type',
          label: 'Toy / Game Type',
          type: 'text',
          required: false,
          placeholder: 'Ex: Action Figure, Board Game, Puzzle',
        },
        {
          name: 'material',
          label: 'Material',
          type: 'text',
          required: false,
          placeholder: 'Ex: Plastic, Wood, Fabric',
        },
      ],
    },
    {
      name: 'Health & Wellness',
      description: 'Vitamins, supplements, medical devices, and wellness products',
      fields: [
        {
          name: 'product_type',
          label: 'Product Type',
          type: 'select',
          required: true,
          options: ['Vitamins & Supplements', 'Medical Device', 'Fitness Equipment', 'Personal Protective', 'Herbal / Natural', 'Other'],
          defaultValue: 'Vitamins & Supplements',
        },
        {
          name: 'dosage_form',
          label: 'Form / Dosage',
          type: 'text',
          required: false,
          placeholder: 'Ex: Capsule, Liquid, Tablet, Powder',
        },
        {
          name: 'quantity_count',
          label: 'Count / Volume',
          type: 'text',
          required: false,
          placeholder: 'Ex: 60 capsules, 500ml',
        },
      ],
    },
    {
      name: 'Vehicles & Parts',
      description: 'Cars, motorcycles, spare parts, and accessories',
      fields: [
        {
          name: 'vehicle_type',
          label: 'Vehicle Type',
          type: 'select',
          required: true,
          options: ['Car', 'Motorcycle', 'Bicycle', 'Truck', 'Bus', 'Other'],
          defaultValue: 'Car',
        },
        {
          name: 'brand',
          label: 'Brand / Make',
          type: 'text',
          required: false,
          placeholder: 'Ex: Toyota, Honda, Kia',
        },
        {
          name: 'year',
          label: 'Year',
          type: 'text',
          required: false,
          placeholder: 'Ex: 2020',
        },
        {
          name: 'part_name',
          label: 'Part Name / Model',
          type: 'text',
          required: false,
          placeholder: 'Ex: Brake Pad, Engine Oil Filter',
        },
      ],
    },
    {
      name: 'Art & Crafts',
      description: 'Handmade art, craft supplies, and creative goods',
      fields: [
        {
          name: 'art_type',
          label: 'Art Type',
          type: 'select',
          required: true,
          options: ['Painting', 'Drawing', 'Sculpture', 'Photography', 'Digital Art', 'Handcraft', 'Beadwork', 'Textile Art', 'Other'],
          defaultValue: 'Handcraft',
        },
        {
          name: 'medium',
          label: 'Medium / Material',
          type: 'text',
          required: false,
          placeholder: 'Ex: Acrylic, Watercolor, Clay',
        },
        {
          name: 'dimensions',
          label: 'Dimensions',
          type: 'text',
          required: false,
          placeholder: 'Ex: A4, 30×40 cm',
        },
        {
          name: 'is_custom',
          label: 'Custom Order Available?',
          type: 'select',
          required: false,
          options: ['Yes', 'No'],
          defaultValue: 'No',
        },
      ],
    },
    {
      name: 'Jewelry & Watches',
      description: 'Fine jewelry, costume jewelry, and timepieces',
      fields: [
        {
          name: 'jewelry_type',
          label: 'Jewelry Type',
          type: 'select',
          required: true,
          options: ['Necklace', 'Bracelet', 'Ring', 'Earring', 'Anklet', 'Watch', 'Brooch', 'Set', 'Other'],
          defaultValue: 'Necklace',
        },
        {
          name: 'material',
          label: 'Material / Metal',
          type: 'text',
          required: false,
          placeholder: 'Ex: 18K Gold, Sterling Silver, Beads',
        },
        {
          name: 'gemstone',
          label: 'Gemstone / Stone',
          type: 'text',
          required: false,
          placeholder: 'Ex: Diamond, Ruby, None',
        },
        {
          name: 'gender',
          label: 'For',
          type: 'select',
          required: false,
          options: ['Unisex', 'Women', 'Men'],
          defaultValue: 'Unisex',
        },
      ],
    },
    {
      name: 'Services',
      description: 'Professional services, freelance work, and skilled trades',
      fields: [
        {
          name: 'service_type',
          label: 'Service Type',
          type: 'text',
          required: true,
          placeholder: 'Ex: Graphic Design, Plumbing, Photography',
        },
        {
          name: 'delivery_time',
          label: 'Turnaround / Duration',
          type: 'text',
          required: false,
          placeholder: 'Ex: Same day, 3–5 days, Per hour',
        },
        {
          name: 'location',
          label: 'Service Location',
          type: 'select',
          required: false,
          options: ['Remote / Online', 'On-site (Client Location)', 'At My Location', 'Flexible'],
          defaultValue: 'Remote / Online',
        },
      ],
    },
    {
      name: 'Baby & Kids',
      description: 'Baby gear, kids clothing, and children\'s products',
      fields: [
        {
          name: 'age_group',
          label: 'Age Group',
          type: 'select',
          required: true,
          options: ['Newborn (0–3 months)', 'Baby (3–12 months)', 'Toddler (1–3 years)', 'Kids (4–8 years)', 'Pre-teen (9–12 years)'],
          defaultValue: 'Baby (3–12 months)',
        },
        {
          name: 'product_type',
          label: 'Product Type',
          type: 'select',
          required: false,
          options: ['Clothing', 'Footwear', 'Feeding & Nursing', 'Diapering', 'Nursery', 'Safety', 'Strollers & Carriers', 'Toys', 'Other'],
          defaultValue: 'Other',
        },
        {
          name: 'gender',
          label: 'Gender',
          type: 'select',
          required: false,
          options: ['Unisex', 'Boy', 'Girl'],
          defaultValue: 'Unisex',
        },
      ],
    },
    {
      name: 'Office Supplies',
      description: 'Office equipment, supplies, and business essentials',
      fields: [
        {
          name: 'product_type',
          label: 'Product Type',
          type: 'select',
          required: true,
          options: ['Printing & Copying', 'Desk & Organization', 'Tech Accessories', 'Packaging', 'Filing', 'Writing', 'Other'],
          defaultValue: 'Other',
        },
        {
          name: 'brand',
          label: 'Brand',
          type: 'text',
          required: false,
          placeholder: 'Ex: HP, Bic, Leitz',
        },
        {
          name: 'quantity_unit',
          label: 'Pack Size / Unit',
          type: 'text',
          required: false,
          placeholder: 'Ex: Pack of 12, Ream of 500',
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

  console.log(`Seeding complete! ${categories.length} categories upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
