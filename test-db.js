const mongoose = require('mongoose');
require('dotenv').config();

// Ambil URI dari .env
const uri = process.env.MONGODB_URI;

const testConnection = async () => {
  console.log('🔄 Mencoba koneksi ke MongoDB Atlas...');
  console.log('URI (hidden):', uri.replace(/:[^:@]*@/, ':****@'));
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    
    console.log('✅ KONEKSI BERHASIL!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Coba list collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Jumlah collections: ${collections.length}`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    await mongoose.disconnect();
    console.log('🔌 Koneksi ditutup.');
    
  } catch (error) {
    console.error('❌ KONEKSI GAGAL:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 SOLUSI:');
      console.log('1. Nama cluster salah!');
      console.log('2. Gunakan @wzekl4h.mongodb.net bukan @testdb.pubxnme.mongodb.net');
      console.log('3. Cek file .env, pastikan URI sudah benar');
    }
    
    if (error.message.includes('IP')) {
      console.log('\n💡 SOLUSI IP:');
      console.log('1. Login ke https://cloud.mongodb.com');
      console.log('2. Network Access → Add IP Address');
      console.log('3. Pilih "Allow Access from Anywhere" (0.0.0.0/0)');
    }
  }
};

testConnection();