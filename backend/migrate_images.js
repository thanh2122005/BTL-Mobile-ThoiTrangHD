const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

const migrateImages = async () => {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  try {
    const [products] = await pool.query("SELECT id, image FROM products WHERE image LIKE 'http%'");
    console.log(`Tìm thấy ${products.length} sản phẩm cần tải ảnh.`);

    for (const p of products) {
      const imgUrl = p.image;
      // Get extension from URL or fallback to jpg
      let ext = '.jpg';
      try {
        const urlObj = new URL(imgUrl);
        const urlExt = path.extname(urlObj.pathname);
        if (urlExt) ext = urlExt;
      } catch (e) {}

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'img-' + uniqueSuffix + ext;
      const destPath = path.join(uploadDir, filename);

      try {
        console.log(`Đang tải: ${imgUrl}`);
        await downloadFile(imgUrl, destPath);
        const localUrl = '/uploads/' + filename;
        await pool.query('UPDATE products SET image = ? WHERE id = ?', [localUrl, p.id]);
        console.log(`Thành công: ${p.id} -> ${localUrl}`);
      } catch (err) {
        console.error(`Lỗi tải ảnh cho sản phẩm ${p.id}:`, err.message);
      }
    }
    
    console.log('✅ Hoàn thành cập nhật ảnh sản phẩm!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi migration:', error);
    process.exit(1);
  }
};

migrateImages();
