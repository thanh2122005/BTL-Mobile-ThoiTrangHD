const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
};

// Map of keywords in product name -> curated Unsplash fashion image URLs
const IMAGE_RULES = [
  // --- ÁO ---
  {
    pattern: /polo/i,
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /cổ lọ|thu đông/i,
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /sơ mi.*oxford/i,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /sơ mi.*lụa|sơ mi.*satin/i,
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /sơ mi/i,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /len.*vặn thừng|len.*cổ tròn|len/i,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /bomber/i,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /denim|jean/i,
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /cardigan/i,
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /hoodie/i,
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /blazer/i,
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /tanktop/i,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /typo.*vintage|thun.*unisex/i,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /trench coat/i,
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /khoác/i,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop'
  },

  // --- QUẦN ---
  {
    pattern: /quần tây|quần âu|slimfit/i,
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /quần jean.*ống đứng|quần jean.*retro/i,
    image: 'https://images.unsplash.com/photo-1542272604-780c96856592?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /ống loe/i,
    image: 'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /kaki.*baggy|kaki/i,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /short.*kaki|short/i,
    image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /jogger/i,
    image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /baggy.*vải|baggy.*công sở/i,
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /ống rộng|tuyết mưa/i,
    image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /cargo|túi hộp/i,
    image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /chinos/i,
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /legging/i,
    image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /culottes|đũi/i,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /quần short dù/i,
    image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=800&auto=format&fit=crop'
  },

  // --- VÁY ---
  {
    pattern: /hoa nhí/i,
    image: 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /cổ yếm|body/i,
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /chữ a.*xếp ly|xếp ly/i,
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /bút chì/i,
    image: 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /đầm sơ mi/i,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /midi.*tầng|midi/i,
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /2 dây.*lụa|2 dây/i,
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /babydoll/i,
    image: 'https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /chân váy jeans|chân váy jean/i,
    image: 'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /maxi/i,
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /đầm vest/i,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /chân váy kaki/i,
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /đầm len/i,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /trễ vai/i,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop'
  },

  // --- BỘ ---
  {
    pattern: /set bộ thể thao.*jogger|bộ thể thao/i,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set blazer/i,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set.*croptop/i,
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /pijama/i,
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /biker short/i,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set vest nam/i,
    image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set.*đũi/i,
    image: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set.*tweed/i,
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /bộ mặc nhà/i,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /đi biển.*hawaii/i,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set.*gile/i,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set.*gym|set.*yoga/i,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /set.*cargo/i,
    image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /bơi/i,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop'
  },

  // --- GIÀY ---
  {
    pattern: /sneaker.*thể thao.*nam|đệm khí|chạy bộ.*boost/i,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /oxford/i,
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /loafer/i,
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /cao gót/i,
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /sandal.*nữ/i,
    image: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /sneaker.*nữ|trắng tinh khôi/i,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /búp bê/i,
    image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /boots.*nữ/i,
    image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /slip-on|slipon/i,
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /sandal.*nam/i,
    image: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /chelsea boots/i,
    image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /dép sục|lót lông/i,
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /mule/i,
    image: 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?q=80&w=800&auto=format&fit=crop'
  },

  // --- PHỤ KIỆN ---
  {
    pattern: /thắt lưng/i,
    image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /ví nam|ví nữ/i,
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /kính mát/i,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /đồng hồ/i,
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /cà vạt/i,
    image: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /khăn choàng/i,
    image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /mũ len|beanie/i,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /găng tay/i,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /vòng tay/i,
    image: 'https://images.unsplash.com/photo-1611591475152-478d13b6676f?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /bông tai/i,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /túi đeo chéo|balo/i,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop'
  },
  {
    pattern: /vớ/i,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?q=80&w=800&auto=format&fit=crop'
  }
];

// Fallback pools per category to ensure no duplicate even if rule misses
const CATEGORY_FALLBACK_IMAGES = {
  'Áo': [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop'
  ],
  'Quần': [
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542272604-780c96856592?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop'
  ],
  'Váy': [
    'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop'
  ],
  'Bộ': [
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?q=80&w=800&auto=format&fit=crop'
  ],
  'Giày': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=800&auto=format&fit=crop'
  ],
  'Phụ kiện': [
    'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop'
  ]
};

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL DB thoitranghd_db');

  const [products] = await conn.query('SELECT id, name, category, image FROM products ORDER BY id ASC');
  console.log(`Processing ${products.length} products...`);

  let updatedCount = 0;
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    let newImg = null;

    // Check specific name pattern match
    for (const rule of IMAGE_RULES) {
      if (rule.pattern.test(prod.name)) {
        newImg = rule.image;
        break;
      }
    }

    // Only update if current image is a duplicate placeholder or mismatched
    const isPlaceholder = 
      prod.image === 'sp1.jpg' ||
      prod.image === 'sp2.jpg' ||
      prod.image === 'sp3.jpg' ||
      prod.image === 'sp4.jpg' ||
      prod.image === 'sp5.jpg' ||
      prod.image === 'sp6.jpg' ||
      (prod.category === 'Giày' && prod.image.includes('wallet')) ||
      (prod.category === 'Áo' && prod.image === 'sp1.jpg' && prod.id !== '1') ||
      (prod.category === 'Bộ' && prod.image === 'sp1.jpg') ||
      (prod.category === 'Quần' && prod.image === 'sp2.jpg' && prod.id !== '2') ||
      (prod.category === 'Váy' && prod.image === 'sp3.jpg' && prod.id !== '3');

    if (isPlaceholder) {
      if (!newImg) {
        const pool = CATEGORY_FALLBACK_IMAGES[prod.category] || CATEGORY_FALLBACK_IMAGES['Áo'];
        newImg = pool[i % pool.length];
      }

      await conn.query('UPDATE products SET image = ? WHERE id = ?', [newImg, prod.id]);
      console.log(`[Updated] #${prod.id} "${prod.name}" (${prod.category}) -> ${newImg.slice(0, 60)}...`);
      updatedCount++;
    }
  }

  console.log(`\nDONE! Updated ${updatedCount} products with diverse, high-quality images.`);

  const [remaining] = await conn.query('SELECT image, count(*) as count FROM products GROUP BY image HAVING count > 3 ORDER BY count DESC');
  console.log('Remaining images with count > 3:', remaining);

  await conn.end();
}

main().catch(console.error);
