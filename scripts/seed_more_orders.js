const mysql = require('mysql2/promise');

async function seedMoreOrders() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'thoitranghd_db'
  });

  console.log('Connected to MySQL thoitranghd_db...');

  // 15 more Processing orders (making 20 total Processing)
  const processingOrders = [
    {
      order_code: 'HD819203',
      user_id: 23,
      customer_name: 'Lương Diệu Linh',
      customer_phone: '0981556677',
      customer_address: 'Tòa nhà Charmvit, 117 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 30000,
      subtotal: 950000,
      discount_amount: 50000,
      total_price: 930000,
      status: 'Processing',
      order_note: 'Giao giờ hành chính, gọi trước 10 phút.',
      hours_ago: 5, // Shop đang đóng gói
      items: [
        { product_id: '9', product_name: 'Áo Sơ Mi Lụa Trắng Dài Tay Cao Cấp', price: 950000, quantity: 1, size: 'S', color: '#ffffff' }
      ]
    },
    {
      order_code: 'HD724185',
      user_id: 20,
      customer_name: 'Hồ Quang Vinh',
      customer_phone: '0944889900',
      customer_address: 'Số 120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 1200000,
      discount_amount: 0,
      total_price: 1230000,
      status: 'Processing',
      order_note: 'Cho kiểm tra hàng trước khi thanh toán tiền.',
      hours_ago: 7, // Shop đang đóng gói
      items: [
        { product_id: '7', product_name: 'Áo Blazer Nam Màu Be Minimalist', price: 1200000, quantity: 1, size: 'L', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD639201',
      user_id: 25,
      customer_name: 'Chu Khánh Ly',
      customer_phone: '0928112233',
      customer_address: 'Căn hộ A1502, Chung cư Vinhomes Metropolis, 29 Liễu Giai, Ba Đình, Hà Nội',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 0,
      subtotal: 1800000,
      discount_amount: 100000,
      total_price: 1700000,
      status: 'Processing',
      order_note: 'Gói hộp quà cẩn thận giúp mình nhé shop.',
      hours_ago: 10, // Shop đang đóng gói
      items: [
        { product_id: '10', product_name: 'Túi Xách Nữ Da Thật Khóa Kim Loại', price: 1800000, quantity: 1, size: 'Tiêu chuẩn', color: '#000000' }
      ]
    },
    {
      order_code: 'HD518293',
      user_id: 12,
      customer_name: 'Đặng Hải Đăng',
      customer_phone: '0918776655',
      customer_address: 'Số 250 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 30000,
      subtotal: 1100000,
      discount_amount: 50000,
      total_price: 1080000,
      status: 'Processing',
      order_note: 'Giao trong ngày mai nếu được nhé.',
      hours_ago: 16, // Đã xuất kho
      items: [
        { product_id: '13', product_name: 'Giày Sneaker Da Trắng Tối Giản', price: 1100000, quantity: 1, size: '42', color: '#ffffff' }
      ]
    },
    {
      order_code: 'HD940182',
      user_id: 9,
      customer_name: 'Phạm Thu Hà',
      customer_phone: '0903889900',
      customer_address: 'Số 42 Lạch Tray, Quận Ngô Quyền, TP. Hải Phòng',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 35000,
      subtotal: 950000,
      discount_amount: 0,
      total_price: 985000,
      status: 'Processing',
      order_note: 'Giao giờ hành chính, gọi trước 15 phút.',
      hours_ago: 22, // Đã xuất kho
      items: [
        { product_id: '4', product_name: 'Đầm Xòe Nữ Họa Tiết Hoa Đỏ Vintage', price: 950000, quantity: 1, size: 'M', color: '#dc2626' }
      ]
    },
    {
      order_code: 'HD837192',
      user_id: 18,
      customer_name: 'Trương Gia Huy',
      customer_phone: '0909445566',
      customer_address: 'Số 79 Hoàng Văn Thụ, Phường 7, TP. Vũng Tàu',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 35000,
      subtotal: 770000,
      discount_amount: 30000,
      total_price: 775000,
      status: 'Processing',
      order_note: 'Để ở quầy lễ tân nếu mình không nghe máy.',
      hours_ago: 26, // Đã xuất kho
      items: [
        { product_id: '2', product_name: 'Áo Thun Nam Graphic Outcast', price: 420000, quantity: 1, size: 'XL', color: '#111827' },
        { product_id: '1', product_name: 'Áo Thun Cotton Basic HOTEL', price: 350000, quantity: 1, size: 'XL', color: '#ffffff' }
      ]
    },
    {
      order_code: 'HD756291',
      user_id: 16,
      customer_name: 'Phan Thanh Tùng',
      customer_phone: '0915667788',
      customer_address: 'Số 15 Lê Lợi, Phường Vĩnh Ninh, TP. Huế',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 680000,
      discount_amount: 0,
      total_price: 710000,
      status: 'Processing',
      order_note: 'Cho mình xem kiểm tra hàng trước khi nhận.',
      hours_ago: 32, // Đã xuất kho
      items: [
        { product_id: '6', product_name: 'Quần Jeans Nữ Rách Gối Họa Tiết', price: 680000, quantity: 1, size: 'L', color: '#2563eb' }
      ]
    },
    {
      order_code: 'HD628391',
      user_id: 15,
      customer_name: 'Trần Bảo Ngọc',
      customer_phone: '0922445566',
      customer_address: 'Biệt thự B24 KĐT Nam Cường, Tố Hữu, Hà Đông, Hà Nội',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 0,
      subtotal: 2500000,
      discount_amount: 150000,
      total_price: 2350000,
      status: 'Processing',
      order_note: 'Áo măng tô đóng hộp cứng chống nhăn giúp mình nhé.',
      hours_ago: 40, // Đang trung chuyển
      items: [
        { product_id: '12', product_name: 'Áo Khoác Trench Coat Dáng Dài Khuy Kép', price: 2500000, quantity: 1, size: 'M', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD539182',
      user_id: 22,
      customer_name: 'Võ Minh Trí',
      customer_phone: '0919334455',
      customer_address: 'Số 54 Đại lộ Hòa Bình, Ninh Kiều, TP. Cần Thơ',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 35000,
      subtotal: 850000,
      discount_amount: 50000,
      total_price: 835000,
      status: 'Processing',
      order_note: 'Giao buổi chiều sau 14h.',
      hours_ago: 44, // Đang trung chuyển
      items: [
        { product_id: '8', product_name: 'Quần Tây Nữ Ống Đứng Tailored Đen', price: 850000, quantity: 1, size: 'L', color: '#000000' }
      ]
    },
    {
      order_code: 'HD482910',
      user_id: 11,
      customer_name: 'Bùi Thanh Trúc',
      customer_phone: '0945667788',
      customer_address: 'Số 108 Trần Phú, Vĩnh Nguyên, TP. Nha Trang, Khánh Hòa',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 30000,
      subtotal: 650000,
      discount_amount: 0,
      total_price: 680000,
      status: 'Processing',
      order_note: 'Kính mắt đóng hộp chống vỡ cẩn thận.',
      hours_ago: 48, // Đang trung chuyển
      items: [
        { product_id: '11', product_name: 'Kính Mát Thời Trang Gọng Kim Loại Vàng', price: 650000, quantity: 1, size: 'Tiêu chuẩn', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD391827',
      user_id: 8,
      customer_name: 'Đỗ Phương Linh',
      customer_phone: '0987112233',
      customer_address: 'Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh, TP. Hồ Chí Minh',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 0,
      subtotal: 1330000,
      discount_amount: 100000,
      total_price: 1230000,
      status: 'Processing',
      order_note: 'Gửi sảnh lễ tân tòa nhà giúp em.',
      hours_ago: 54, // Đang trung chuyển
      items: [
        { product_id: '4', product_name: 'Đầm Xòe Nữ Họa Tiết Hoa Đỏ Vintage', price: 950000, quantity: 1, size: 'S', color: '#dc2626' },
        { product_id: '15', product_name: 'Quần Short Kaki Nữ Cạp Cao Kèm Thắt Lưng', price: 380000, quantity: 1, size: 'S', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD284910',
      user_id: 13,
      customer_name: 'Lê Quỳnh Trang',
      customer_phone: '0978223344',
      customer_address: 'Số 68 Quang Trung, Phường 10, Gò Vấp, TP. Hồ Chí Minh',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 900000,
      discount_amount: 50000,
      total_price: 880000,
      status: 'Processing',
      order_note: 'Giao hàng trước 17h, gọi trước 15p.',
      hours_ago: 65, // Shipper đang giao
      items: [
        { product_id: '3', product_name: 'Áo Sweater Nỉ Trơn Mint Pastel', price: 450000, quantity: 2, size: 'M', color: '#10b981' }
      ]
    },
    {
      order_code: 'HD194820',
      user_id: 14,
      customer_name: 'Nguyễn Đức Thắng',
      customer_phone: '0966334455',
      customer_address: 'Số 36 Nguyễn Thị Minh Khai, TP. Biên Hòa, Đồng Nai',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 30000,
      subtotal: 1200000,
      discount_amount: 80000,
      total_price: 1150000,
      status: 'Processing',
      order_note: 'Shipper đến bấm chuông cổng giúp mình.',
      hours_ago: 70, // Shipper đang giao
      items: [
        { product_id: '7', product_name: 'Áo Blazer Nam Màu Be Minimalist', price: 1200000, quantity: 1, size: 'XL', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD958102',
      user_id: 10,
      customer_name: 'Vũ Quốc Cường',
      customer_phone: '0934556677',
      customer_address: 'Số 91 Đại lộ Bình Dương, TP. Thủ Dầu Một, Bình Dương',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 700000,
      discount_amount: 0,
      total_price: 730000,
      status: 'Processing',
      order_note: 'Cho kiểm tra hàng, vừa vặn mới thanh toán.',
      hours_ago: 75, // Shipper đang giao
      items: [
        { product_id: '1', product_name: 'Áo Thun Cotton Basic HOTEL', price: 350000, quantity: 2, size: 'L', color: '#000000' }
      ]
    },
    {
      order_code: 'HD849201',
      user_id: 7,
      customer_name: 'Hoàng Minh Tuấn',
      customer_phone: '0912445566',
      customer_address: 'Số 16 Trường Thi, TP. Vinh, Nghệ An',
      payment_method: 'bank',
      payment_status: 'paid',
      shipping_fee: 35000,
      subtotal: 1100000,
      discount_amount: 50000,
      total_price: 1085000,
      status: 'Processing',
      order_note: 'Giao giờ hành chính đến cơ quan.',
      hours_ago: 82, // Shipper đang giao
      items: [
        { product_id: '13', product_name: 'Giày Sneaker Da Trắng Tối Giản', price: 1100000, quantity: 1, size: '41', color: '#ffffff' }
      ]
    }
  ];

  // 8 Pending orders (making ~8 total Pending)
  const pendingOrders = [
    {
      order_code: 'HD991024',
      user_id: 17,
      customer_name: 'Mai Ánh Tuyết',
      customer_phone: '0989112233',
      customer_address: 'Tầng 12, Tòa Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm, Hà Nội',
      payment_method: 'bank',
      payment_status: 'paid_pending_verification',
      shipping_fee: 30000,
      subtotal: 950000,
      discount_amount: 50000,
      total_price: 930000,
      status: 'Pending',
      order_note: 'Em vừa chuyển khoản 930k qua Vietcombank, shop check duyệt giúp em nhé!',
      hours_ago: 0.5,
      items: [
        { product_id: '9', product_name: 'Áo Sơ Mi Lụa Trắng Dài Tay Cao Cấp', price: 950000, quantity: 1, size: 'M', color: '#ffffff' }
      ]
    },
    {
      order_code: 'HD882910',
      user_id: 21,
      customer_name: 'Đinh Thúy Hằng',
      customer_phone: '0977223344',
      customer_address: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      payment_method: 'bank',
      payment_status: 'paid_pending_verification',
      shipping_fee: 30000,
      subtotal: 1470000,
      discount_amount: 100000,
      total_price: 1400000,
      status: 'Pending',
      order_note: 'Đã thanh toán MB Bank nội dung HD882910. Shop ship sớm giúp mình.',
      hours_ago: 1.2,
      items: [
        { product_id: '14', product_name: 'Áo Hoodie Nữ Nỉ Bông Có Mũ', price: 520000, quantity: 1, size: 'M', color: '#ec4899' },
        { product_id: '4', product_name: 'Đầm Xòe Nữ Họa Tiết Hoa Đỏ Vintage', price: 950000, quantity: 1, size: 'S', color: '#dc2626' }
      ]
    },
    {
      order_code: 'HD773829',
      user_id: 19,
      customer_name: 'Cao Thị Mỹ Duyên',
      customer_phone: '0938776655',
      customer_address: '280 Nguyễn Tri Phương, Phường 4, Quận 10, TP. Hồ Chí Minh',
      payment_method: 'bank',
      payment_status: 'paid_pending_verification',
      shipping_fee: 0,
      subtotal: 1800000,
      discount_amount: 100000,
      total_price: 1700000,
      status: 'Pending',
      order_note: 'Đã quét QR chuyển khoản Techcombank thành công.',
      hours_ago: 2.5,
      items: [
        { product_id: '10', product_name: 'Túi Xách Nữ Da Thật Khóa Kim Loại', price: 1800000, quantity: 1, size: 'Tiêu chuẩn', color: '#111827' }
      ]
    },
    {
      order_code: 'HD664910',
      user_id: 24,
      customer_name: 'Dương Văn Nam',
      customer_phone: '0963889900',
      customer_address: 'Số 88 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
      payment_method: 'bank',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 680000,
      discount_amount: 0,
      total_price: 710000,
      status: 'Pending',
      order_note: 'Shop đợi chút tí mình ra ngân hàng nạp tiền rồi chuyển nhé.',
      hours_ago: 3.5,
      items: [
        { product_id: '6', product_name: 'Quần Jeans Nữ Rách Gối Họa Tiết', price: 680000, quantity: 1, size: 'XL', color: '#2563eb' }
      ]
    },
    {
      order_code: 'HD559201',
      user_id: 26,
      customer_name: 'Tạ Đức Anh',
      customer_phone: '0931445566',
      customer_address: 'Số 152 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng',
      payment_method: 'bank',
      payment_status: 'pending',
      shipping_fee: 30000,
      subtotal: 420000,
      discount_amount: 0,
      total_price: 450000,
      status: 'Pending',
      order_note: 'Chờ khách chuyển khoản.',
      hours_ago: 5,
      items: [
        { product_id: '2', product_name: 'Áo Thun Nam Graphic Outcast', price: 420000, quantity: 1, size: 'L', color: '#111827' }
      ]
    },
    {
      order_code: 'HD448192',
      user_id: 23,
      customer_name: 'Lương Diệu Linh',
      customer_phone: '0981556677',
      customer_address: 'Tòa Keangnam Landmark 72, Nam Từ Liêm, Hà Nội',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 760000,
      discount_amount: 40000,
      total_price: 750000,
      status: 'Pending',
      order_note: 'Giao trong giờ hành chính, gọi trước 15p.',
      hours_ago: 6,
      items: [
        { product_id: '15', product_name: 'Quần Short Kaki Nữ Cạp Cao Kèm Thắt Lưng', price: 380000, quantity: 2, size: 'M', color: '#000000' }
      ]
    },
    {
      order_code: 'HD337192',
      user_id: 20,
      customer_name: 'Hồ Quang Vinh',
      customer_phone: '0944889900',
      customer_address: 'Số 120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 1200000,
      discount_amount: 50000,
      total_price: 1180000,
      status: 'Pending',
      order_note: 'Cho mình xem hàng và thử áo trước khi thanh toán COD.',
      hours_ago: 8,
      items: [
        { product_id: '7', product_name: 'Áo Blazer Nam Màu Be Minimalist', price: 1200000, quantity: 1, size: 'L', color: '#d97706' }
      ]
    },
    {
      order_code: 'HD228190',
      user_id: 25,
      customer_name: 'Chu Khánh Ly',
      customer_phone: '0928112233',
      customer_address: '29 Liễu Giai, Ba Đình, Hà Nội',
      payment_method: 'cod',
      payment_status: 'unpaid',
      shipping_fee: 30000,
      subtotal: 850000,
      discount_amount: 0,
      total_price: 880000,
      status: 'Pending',
      order_note: 'Giao sớm cho mình kịp mang đi du lịch cuối tuần.',
      hours_ago: 11,
      items: [
        { product_id: '8', product_name: 'Quần Tây Nữ Ống Đứng Tailored Đen', price: 850000, quantity: 1, size: 'S', color: '#000000' }
      ]
    }
  ];

  const allToInsert = [...processingOrders, ...pendingOrders];

  for (const o of allToInsert) {
    const [existing] = await connection.query('SELECT id FROM orders WHERE order_code = ?', [o.order_code]);
    if (existing.length > 0) {
      console.log(`Order ${o.order_code} already exists, skipping.`);
      continue;
    }

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

    for (const it of o.items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, it.product_id, it.product_name, it.price, it.quantity, it.size, it.color]
      );
    }

    console.log(`✓ Inserted ${o.status} order ${o.order_code} (ID: ${orderId}) for ${o.customer_name}`);
  }

  await connection.end();
  console.log('Finished seeding 23 realistic orders!');
}

seedMoreOrders().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
