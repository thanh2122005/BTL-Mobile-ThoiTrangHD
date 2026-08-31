const mysql = require('mysql2/promise');


const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
};

async function seedData() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Đã kết nối DB để thêm dữ liệu mẫu...');

    // 1. Thêm Users
    const password = '123';
    const users = [
      ['Trần Thị B', 'tranthib@gmail.com', password, '0987654321', 'user'],
      ['Lê Văn C', 'levanc@gmail.com', password, '0912345678', 'user'],
    ];

    for (const u of users) {
      try {
        await connection.query(
          'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
          u
        );
        console.log(`Đã thêm user: ${u[0]}`);
      } catch (e) {
        // Có thể bị trùng email
      }
    }

    // Lấy ID user
    const [userRows] = await connection.query('SELECT id, name, phone, email FROM users WHERE role = "user" LIMIT 3');
    if (userRows.length === 0) return;

    // Lấy một số product
    const [productRows] = await connection.query('SELECT id, name, price, image FROM products LIMIT 10');
    if (productRows.length === 0) return;

    // 2. Thêm Orders
    const ordersData = [
      {
        user: userRows[0],
        status: 'Processing',
        payment: 'bank',
        items: [
          { p: productRows[0], qty: 2, size: 'L', color: '#000000' },
          { p: productRows[1], qty: 1, size: 'M', color: 'Trắng' }
        ]
      },
      {
        user: userRows[1] || userRows[0],
        status: 'Cancelled',
        payment: 'cod',
        items: [
          { p: productRows[2], qty: 1, size: 'XL', color: 'Xanh navy' }
        ]
      },
      {
        user: userRows[0],
        status: 'Completed',
        payment: 'cod',
        items: [
          { p: productRows[3], qty: 1, size: 'S', color: '#000000' },
          { p: productRows[4], qty: 1, size: 'M', color: 'Be' }
        ]
      }
    ];

    for (let i = 0; i < ordersData.length; i++) {
      const order = ordersData[i];
      let subtotal = 0;
      order.items.forEach(it => { subtotal += Number(it.p.price) * it.qty; });
      
      const orderCode = 'HD' + Date.now().toString().slice(-6) + i;
      
      const [res] = await connection.query(
        `INSERT INTO orders (user_id, order_code, customer_name, customer_phone, customer_address, payment_method, subtotal, discount_amount, total_price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [order.user.id, orderCode, order.user.name, order.user.phone, 'Số 123 Đường Test, Hà Nội', order.payment, subtotal, 0, subtotal, order.status]
      );
      
      const orderId = res.insertId;
      
      for (const it of order.items) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size, color)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, it.p.id, it.p.name, it.p.price, it.qty, it.size, it.color]
        );
      }
      console.log(`Đã thêm order: ${orderCode} (${order.status})`);
    }

    // 3. Thêm Reviews cho các sản phẩm đã giao (Completed)
    const [completedOrders] = await connection.query('SELECT * FROM orders WHERE status = "Completed" LIMIT 5');
    for (const order of completedOrders) {
      const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        // Kiểm tra xem đã review chưa
        const [existing] = await connection.query('SELECT id FROM reviews WHERE order_id = ? AND product_id = ?', [order.id, item.product_id]);
        if (existing.length === 0) {
          await connection.query(
            `INSERT INTO reviews (product_id, user_id, user_name, rating, comment, is_verified_purchase, size, color, order_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.product_id, 
              order.user_id, 
              order.customer_name, 
              5, 
              'Sản phẩm rất đẹp, chất vải mát, mặc lên cực kỳ tôn dáng!', 
              1, 
              item.size, 
              item.color, 
              order.id
            ]
          );
          console.log(`Đã thêm review cho product_id: ${item.product_id}`);
        }
      }
    }

    console.log('Thêm dữ liệu mẫu hoàn tất!');
  } catch (error) {
    console.error('Lỗi khi thêm dữ liệu:', error);
  } finally {
    if (connection) await connection.end();
  }
}

seedData();
