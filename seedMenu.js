// seed.js - Isi data awal ke MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const Menu = require('./models/Menu');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://672022100_db_user:I2tqwQIEb55jvCSW@testdb.pubxnme.mongodb.net/warungndeso';

const menus = [
  {
    name: "Es Teh Manis",
    price: 5000,
    category: "Minuman",
    description: "Teh manis segar dengan es batu",
    hasTemperature: true,
    extraPriceForIce: 1000,
    hasVariants: false,
    isAvailable: true
  },
  {
    name: "Indomie Goreng",
    price: 8000,
    category: "Makanan",
    description: "Indomie goreng original",
    hasTemperature: false,
    hasVariants: true,
    variants: [
      { name: "Dengan Telur", extraPrice: 3000 },
      { name: "Tanpa Telur", extraPrice: 0 }
    ],
    isAvailable: true
  },
  {
    name: "Kopi Hitam",
    price: 4000,
    category: "Minuman",
    description: "Kopi hitam original",
    hasTemperature: true,
    extraPriceForIce: 1000,
    hasVariants: false,
    isAvailable: true
  },
  {
    name: "Nasi Goreng",
    price: 12000,
    category: "Makanan",
    description: "Nasi goreng spesial",
    hasTemperature: false,
    hasVariants: true,
    variants: [
      { name: "Dengan Telur", extraPrice: 3000 },
      { name: "Tanpa Telur", extraPrice: 0 }
    ],
    isAvailable: true
  },
  {
    name: "Es Jeruk",
    price: 6000,
    category: "Minuman",
    description: "Jeruk peras segar",
    hasTemperature: true,
    extraPriceForIce: 1000,
    hasVariants: false,
    isAvailable: true
  },
  {
    name: "Mie Goreng",
    price: 10000,
    category: "Makanan",
    description: "Mie goreng spesial",
    hasTemperature: false,
    hasVariants: true,
    variants: [
      { name: "Dengan Telur", extraPrice: 3000 },
      { name: "Tanpa Telur", extraPrice: 0 }
    ],
    isAvailable: true
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Hapus data lama (opsional)
    await Menu.deleteMany({});
    console.log('🔄 Old data cleared');

    // Insert data baru
    const result = await Menu.insertMany(menus);
    console.log(`✅ ${result.length} menus inserted successfully:`);
    result.forEach(menu => {
      console.log(`   - ${menu.name} (${menu.category})`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
}

seed();