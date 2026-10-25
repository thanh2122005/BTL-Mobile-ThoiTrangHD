const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
};

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
];

const CUSTOMERS = [
  'Nguyễn Thu Trang', 'Trần Tuấn Anh', 'Lê Bích Ngọc', 'Vũ Hoàng Nam',
  'Đặng Thùy Dương', 'Phạm Minh Quân', 'Hoàng Kim Ngân', 'Đỗ Hải Đăng',
  'Bùi Phương Thảo', 'Ngô Quốc Huy', 'Phan Gia Linh', 'Trịnh Quốc Bảo',
  'Mai Anh Dũng', 'Dương Thúy Hằng', 'Lý Quang Vinh', 'Tạ Minh Châu'
];

const COMMENTS_BY_CAT = {
  'Quần': [
    'Quần mặc lên cực kỳ tôn dáng, chất vải đanh dày dặn mà co giãn rất thoải mái khi ngồi hay di chuyển. Giao hàng nhanh và đóng gói kỹ càng.',
    'Quần đúng chuẩn form như mô tả, ống suông rũ đẹp hack dáng cực tốt. Đường kim mũi chỉ rất đều, shop tư vấn size chuẩn xác 100%!',
    'Mặc đi làm hay đi chơi dạo phố đều hợp, chất vải không bị xù lông hay phai màu sau khi giặt máy. Cho shop 5 sao chất lượng.',
    'Form quần ống rộng thời thượng, màu bên ngoài y hình chụp mẫu. Vải mát nhẹ không bí, rất đáng tiền!',
    'Quần may cẩn thận từng chi tiết, cạp quần ôm vừa vặn không bị tức bụng. Rất hài lòng và sẽ ủng hộ tiếp.'
  ],
  'Áo': [
    'Vải cotton cao cấp mềm mát thấm hút mồ hôi cực tốt, giặt máy không bị bai dão hay co rút cổ áo. Mặc rất êm ái.',
    'Áo đẹp xuất sắc, màu sắc tươi tắn chuẩn hình. Form dáng rộng rãi thoải mái đúng phong cách trẻ trung năng động!',
    'Chất vải sờ mịn tay, đóng gói hộp chỉn chu có cả tem mác và hướng dẫn giặt là. Chắc chắn sẽ quay lại mua thêm.',
    'Form áo mặc lên người nhìn gọn gàng và tôn dáng. Giá cả hợp lý so với chất lượng vượt trội.',
    'Áo mặc nhẹ nhàng thoáng khí, đường may tỉ mỉ không có chỉ thừa. Điểm 10 cho chất lượng phục vụ của shop.'
  ],
  'Váy': [
    'Đầm mặc lên sang chảnh và tôn vòng eo cực kỳ luôn ạ. Vải rũ nhẹ bay bổng, đi tiệc hay đi biển chụp ảnh ai cũng khen xinh!',
    'Váy có lớp lót trong kín đáo, chất liệu cao cấp không nhăn nhàu. Thiết kế nữ tính thanh lịch, đúng gu của mình.',
    'Màu sắc trang nhã, form chuẩn đét không cần phải bóp eo thêm. Đóng gói rất cẩn thận, cho shop 5 sao!',
    'Chất vải mềm rũ sờ mát tay, tôn dáng thon gọn rõ rệt. Nhận hàng ưng ý hơn cả mong đợi.'
  ],
  'Bộ': [
    'Set đồ phối sẵn mặc vừa tiện lợi vừa cá tính, chất vải thoáng khí mặc cả ngày không hề khó chịu. Mặc đi dạo bạn bè ai cũng hỏi mua ở đâu.',
    'Form dáng chuẩn đẹp, cả áo và quần đều có thể tách rời để mix match với các món đồ khác rất linh hoạt.',
    'Chất vải dày dặn vừa phải, tone sur tone hiện đại. Mua được set đồ ưng ý giá lại rất hợp lý.'
  ],
  'Giày': [
    'Giày đi rất êm chân, lót đệm êm ái di chuyển cả ngày không hề đau mỏi gót. Đế đúc chắc chắn chống trơn trượt tốt.',
    'Da bề mặt bóng mờ sang trọng, form giày chuẩn ôm chân, nâng chiều cao nhẹ nhàng tự nhiên. Rất đáng tiền!',
    'Đóng gói hộp cứng cáp nguyên vẹn, giày không một vết xước. Đi vừa vặn chuẩn size bình thường.'
  ],
  'Phụ kiện': [
    'Phụ kiện hoàn thiện tinh xảo, đường nét sắc sảo, dùng làm điểm nhấn cho outfit cực kỳ nổi bật và bắt mắt.',
    'Chất lượng sản phẩm vượt mong đợi so với mức giá. Đóng hộp trang trọng, giao hàng cực nhanh!',
    'Mẫu mã đúng chuẩn thời trang cao cấp, cầm chắc tay và đẹp như hàng hiệu. Sẽ giới thiệu cho bạn bè.'
  ]
};

async function seedAllReviews() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL...');

  // 1. Lấy tất cả sản phẩm
  const [products] = await conn.query('SELECT id, name, category, price FROM products');
  console.log(`Tìm thấy ${products.length} sản phẩm trong hệ thống.`);

  // 2. Lấy số lượng review hiện có của từng sản phẩm
  const [existingRevs] = await conn.query('SELECT product_id, COUNT(*) as count FROM reviews GROUP BY product_id');
  const countMap = new Map();
  existingRevs.forEach(r => countMap.set(String(r.product_id), r.count));

  let totalAdded = 0;

  for (const prod of products) {
    const prodIdStr = String(prod.id);
    const currCount = countMap.get(prodIdStr) || 0;
    const targetCount = 2; // Đảm bảo mỗi sản phẩm có ít nhất 2 đánh giá
    const needToAdd = Math.max(0, targetCount - currCount);

    if (needToAdd === 0) continue;

    const cat = prod.category || 'Áo';
    const commentPool = COMMENTS_BY_CAT[cat] || COMMENTS_BY_CAT['Áo'];

    const isShoe = cat.toLowerCase().includes('giày');
    const isAcc = cat.toLowerCase().includes('phụ kiện');
    const sizes = isShoe ? ['39', '40', '41', '42'] : isAcc ? ['Tiêu chuẩn', 'Freesize'] : ['S', 'M', 'L', 'XL'];
    const colors = ['Đen', 'Trắng', 'Beige', 'Xanh Navy', 'Xám'];

    for (let i = 0; i < needToAdd; i++) {
      const custName = CUSTOMERS[(parseInt(prod.id, 10) * 3 + i) % CUSTOMERS.length];
      const avatar = AVATARS[(parseInt(prod.id, 10) * 2 + i) % AVATARS.length];
      const comment = commentPool[(parseInt(prod.id, 10) + i) % commentPool.length];
      const size = sizes[(parseInt(prod.id, 10) + i) % sizes.length];
      const color = colors[(parseInt(prod.id, 10) + i) % colors.length];
      const rating = i === 1 && (parseInt(prod.id, 10) % 5 === 0) ? 4 : 5; // Chủ yếu 5 sao, thi thoảng 4 sao

      // Ngày đánh giá ngẫu nhiên trong vài tháng qua
      const month = 1 + ((parseInt(prod.id, 10) + i) % 9); // Tháng 1 - 9 năm 2026
      const day = 1 + ((parseInt(prod.id, 10) * 7 + i) % 28);
      const hour = 9 + (i % 12);
      const minute = 10 + (i * 15 % 50);
      const createdAt = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

      await conn.query(`
        INSERT INTO reviews (product_id, user_name, user_avatar, rating, comment, size, color, is_verified_purchase, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [prod.id, custName, avatar, rating, comment, size, color, createdAt]);

      totalAdded++;
    }
  }

  console.log(`✅ Đã thêm thành công ${totalAdded} đánh giá chất lượng cho các sản phẩm!`);

  // Kiểm tra lại các sản phẩm top đầu danh mục
  const [topProds] = await conn.query(`
    SELECT p.id, p.name, p.category, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    GROUP BY p.id, p.name, p.category
    ORDER BY (p.stock > 0) DESC, p.id NOT IN (1, 2) DESC, p.sold_count DESC, CAST(p.id AS UNSIGNED) DESC
    LIMIT 10
  `);

  console.log('\n🌟 Đánh giá của Top 10 sản phẩm đầu danh mục:');
  topProds.forEach((p, idx) => {
    console.log(`${idx + 1}. [ID: ${p.id}] ${p.name} (${p.category}) -> ${p.review_count} đánh giá (⭐️ ${Number(p.avg_rating || 5).toFixed(1)}/5)`);
  });

  await conn.end();
}

seedAllReviews().catch(err => {
  console.error('Lỗi khi seed đánh giá:', err);
  process.exit(1);
});
