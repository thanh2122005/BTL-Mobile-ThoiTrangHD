const mysql = require('mysql2/promise');

async function seedProcessingOrders() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'thoitranghd_db'
  });

  console.log('Connected to MySQL database thoitranghd...');

  const sampleOrders = [
    {
      order_code: 'HD782194',
      user_id: 17,
      customer_name: 'Mai Ánh Tuyết',
      customer_phone: '0989112233',
      customer_address: 'Tầng 12, Tòa Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm, Hà Nội',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 30000,
      subtotal: 1370000,
      discount_amount: 50000,
      total_price: 1350000,
      status: 'Processing',
      order_note: 'Giao giờ hành chính, gọi trước 15 phút giúp mình.',
      hours_ago: 36, // ~1.5 ngày trước -> Đang trung chuyển
      items: [
        { product_id: '4', product_name: 'Đầm Xòe Nữ Họa Tiết Hoa Đỏ Vintage', price: 950000, quantity: 1, size: 'M', color: '#dc2626' },
        { product_id: '2', product_name: 'Áo Thun Nam Graphic Outcast', price: 420000, quantity: 1, size: 'L', color: '#111827' }
      ]
    },
    {
      order_code: 'HD659321',
      user_id: 21,
      customer_name: 'Đinh Thúy Hằng',
      customer_phone: '0977223344',
      customer_address: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 25000,
      subtotal: 680000,
      discount_amount: 0,
      total_price: 705000,
      status: 'Processing',
      order_note: 'Cho mình xem hàng trước khi nhận nhé shop.',
      hours_ago: 72, // ~3 ngày trước -> Shipper đang giao gần đến bạn
      items: [
        { product_id: '6', product_name: 'Quần Jeans Nữ Rách Gối Họa Tiết', price: 680000, quantity: 1, size: 'S', color: '#2563eb' }
      ]
    },
    {
      order_code: 'HD912405',
      user_id: 19,
      customer_name: 'Cao Thị Mỹ Duyên',
      customer_phone: '0938776655',
      customer_address: '280 Nguyễn Tri Phương, Phường 4, Quận 10, TP. Hồ Chí Minh',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 30000,
      subtotal: 1200000,
      discount_amount: 100000,
      total_price: 1130000,
      status: 'Processing',
      order_note: 'Gửi hàng cẩn thận, bọc chống sốc áo blazer giúp mình.',
      hours_ago: 18, // 18 tiếng trước -> Đã bàn giao ĐVVC
      items: [
        { product_id: '7', product_name: 'Áo Blazer Nam Màu Be Minimalist', price: 1200000, quantity: 1, size: 'XL', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD438102',
      user_id: 24,
      customer_name: 'Dương Văn Nam',
      customer_phone: '0963889900',
      customer_address: 'Số 88 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 0,
      subtotal: 850000,
      discount_amount: 0,
      total_price: 850000,
      status: 'Processing',
      order_note: 'Giao trong ngày hôm nay nếu được nhé.',
      hours_ago: 4, // 4 tiếng trước -> Shop đang chuẩn bị hàng & đóng gói
      items: [
        { product_id: '8', product_name: 'Quần Tây Nữ Ống Đứng Tailored Đen', price: 850000, quantity: 1, size: 'M', color: '#000000' }
      ]
    },
    {
      order_code: 'HD583920',
      user_id: 26,
      customer_name: 'Tạ Đức Anh',
      customer_phone: '0931445566',
      customer_address: 'Số 152 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 35000,
      subtotal: 1090000,
      discount_amount: 50000,
      total_price: 1075000,
      status: 'Processing',
      order_note: 'Để ở quầy lễ tân tòa nhà nếu mình vắng mặt.',
      hours_ago: 96, // 4 ngày trước -> Shipper đang phát hàng
      items: [
        { product_id: '3', product_name: 'Áo Sweater Nỉ Trơn Mint Pastel', price: 450000, quantity: 1, size: 'L', color: '#10b981' },
        { product_id: '1', product_name: 'Áo Thun Cotton Basic HOTEL', price: 350000, quantity: 1, size: 'L', color: '#ffffff' },
        { product_id: '5', product_name: 'Áo Thun Nam Trắng Basic Cổ Tròn', price: 290000, quantity: 1, size: 'XL', color: '#ffffff' }
      ]
    }
  ];

  for (const o of sampleOrders) {
    // Check if order code already exists
    const [existing] = await connection.query('SELECT id FROM orders WHERE order_code = ?', [o.order_code]);
    if (existing.length > 0) {
      console.log(`Order ${o.order_code} already exists, skipping.`);
      continue;
    }

    // Insert order with custom created_at
    const [res] = await connection.query(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_phone, customer_address,
        payment_method, payment_status, shipping_fee, subtotal, discount_amount,
        total_price, status, order_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [
        o.order_code, o.user_id, o.customer_name, o.customer_phone, o.customer_address,
        o.payment_method, o.payment_status, o.shipping_fee, o.subtotal, o.discount_amount,
        o.total_price, o.status, o.order_note, o.hours_ago
      ]
    );

    const orderId = res.insertId;

    // Insert items
    for (const it of o.items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, it.product_id, it.product_name, it.price, it.quantity, it.size, it.color]
      );
    }

    console.log(`✓ Inserted order ${o.order_code} (ID: ${orderId}) in Processing status`);
  }

  await connection.end();
  console.log('Seeding completed successfully!');
}

seedProcessingOrders().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
