const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const directory = './uploads'; // Folder gambar kamu

fs.readdirSync(directory).forEach(file => {
  const filePath = path.join(directory, file);
  const ext = path.extname(file).toLowerCase();
  
  // Hanya proses jika file adalah gambar dan bukan yang sudah dikompres
  if (['.jpg', '.jpeg', '.png'].includes(ext) && !file.startsWith('opt-')) {
    const output = path.join(directory, `opt-${file.replace(ext, '.webp')}`);
    
    sharp(filePath)
      .resize(400) // Ukuran maksimal lebar 400px (cukup untuk HP)
      .webp({ quality: 80 })
      .toFile(output)
      .then(() => {
        console.log(`Berhasil kompres: ${file}`);
        // fs.unlinkSync(filePath); // Opsional: Hapus file asli yang berat
      })
      .catch(err => console.error(`Gagal ${file}:`, err));
  }
});