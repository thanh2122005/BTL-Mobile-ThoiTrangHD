const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
};

async function seedMonths() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('Connected to DB');

  const [existing] = await conn.query('SELECT count(*) as count FROM orders WHERE MONTH(created_at) BETWEEN 1 AND 8 AND YEAR(created_at) = 2026');
  if (existing[0].count > 30) {
    console.log('Historical months already have enough data:', existing[0].count);
    await conn.end();
    return;
  }

  const [products] = await conn.query('SELECT id, name, price FROM products LIMIT 50');
  const [users] = await conn.query('SELECT id, name, phone, address FROM users LIMIT 30');

  const customerPool = users.length > 0 ? users : [
    { id: 1, name: 'Nguyễn Văn Hùng', phone: '0912111222', address: 'Số 15 Lê Duẩn, Hoàn Kiếm, Hà Nội' },
    { id: 2, name: 'Trần Thị Thu Thảo', phone: '0988222333', address: '280 Nguyễn Đình Chiểu, Quận 3, TP.HCM' },
    { id: 3, name: 'Phạm Minh Quang', phone: '0903333444', address: '99 Bạch Đằng, Hải Châu, Đà Nẵng' },
  ];

  // Seed 10-18 orders for each month from month 1 to month 8
  for (let m = 1; m <= 8; m++) {
    const ordersInMonth = 12 + Math.floor(Math.random() * 8); // 12-19 orders
    console.log(`Seeding ${ordersInMonth} orders for Month ${m}/2026...`);

    for (let i = 0; i < ordersInMonth; i++) {
      const day = 1 + Math.floor(Math.random() * 27);
      const hour = 8 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      const dateStr = `2026-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

      const user = customerPool[i % customerPool.length];
      const prod1 = products[Math.floor(Math.random() * products.length)];
      const prod2 = products[Math.floor(Math.random() * products.length)];
      const qty1 = 1 + Math.floor(Math.random() * 2);
      const qty2 = 1 + Math.floor(Math.random() * 2);

      const subtotal = (prod1.price * qty1) + (prod2.price * qty2);
      const discount = Math.random() > 0.5 ? 30000 : 0;
      const total = subtotal - discount;

      const orderCode = `HD-2026${String(m).padStart(2, '0')}${String(day).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const [res] = await conn.query(`
        INSERT INTO orders (
          user_id, order_code, customer_name, customer_phone, customer_address,
          payment_method, voucher_code, subtotal, discount_amount, total_price,
          status, created_at, shipping_fee, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id || 1,
        orderCode,
        user.name,
        user.phone,
        user.address || 'Hà Nội',
        Math.random() > 0.4 ? 'VietQR' : 'COD',
        discount > 0 ? 'HDWELCOME' : null,
        subtotal,
        discount,
        total,
        'Completed', // Finished successfully
        dateStr,
        30000,
        'Paid'
      ]);

      const orderId = res.insertId;

      // Insert items
      await conn.query(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size, color)
        VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, prod1.id, prod1.name, prod1.price, qty1, 'L', 'Đen',
        orderId, prod2.id, prod2.name, prod2.price, qty2, 'M', 'Trắng'
      ]);
    }
  }

  console.log('Seeding historical months completed successfully!');
  await conn.end();
}

seedMonths().catch(console.error);
