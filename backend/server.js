const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Phục vụ các file ảnh tĩnh
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Kết nối MySQL database pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Khởi tạo cột role và tài khoản Admin mặc định
(async () => {
  try {
    try {
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
      console.log('✅ Đã thêm cột `role` vào bảng users.');
    } catch (e) {
      // Cột role đã tồn tại
    }

    try {
      await pool.query("ALTER TABLE orders ADD COLUMN order_note TEXT NULL");
      console.log('✅ Đã thêm cột `order_note` vào bảng orders.');
    } catch (e) {}

    try {
      await pool.query("ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(255) NULL");
      console.log('✅ Đã thêm cột `cancel_reason` vào bảng orders.');
    } catch (e) {}

    try {
      await pool.query("ALTER TABLE orders ADD COLUMN shipping_fee INT DEFAULT 0");
      console.log('✅ Đã thêm cột `shipping_fee` vào bảng orders.');
    } catch (e) {}

    // Đảm bảo có tài khoản Admin chính thức
    const [adminCheck] = await pool.query("SELECT id FROM users WHERE email = 'admin@thoitranghd.com'");
    if (adminCheck.length === 0) {
      await pool.query(
        "INSERT INTO users (name, email, phone, password, avatar, role) VALUES (?, ?, ?, ?, ?, ?)",
        ['Ban Quản Trị HD', 'admin@thoitranghd.com', '0988888888', 'admin123', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', 'admin']
      );
      console.log('👑 Đã khởi tạo tài khoản Admin: admin@thoitranghd.com / admin123');
    } else {
      await pool.query("UPDATE users SET role = 'admin' WHERE email = 'admin@thoitranghd.com'");
    }
  } catch (err) {
    console.error('Lỗi kiểm tra role admin:', err.message);
  }
})();

// Helper parse features JSON
const formatProduct = (p) => {
  let features = [];
  if (p.features) {
    try {
      features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features;
    } catch (e) {
      features = [];
    }
  }

  const discount = Number(p.discount) || 0;
  const price = Number(p.price) || 0;
  let originalPrice = p.original_price ? Number(p.original_price) : null;

  if (discount > 0 && !originalPrice) {
    originalPrice = Math.round((price / (1 - discount / 100)) / 10000) * 10000;
    if (originalPrice <= price) {
      originalPrice = Math.round((price * (1 + discount / 100)) / 1000) * 1000;
    }
  }

  return {
    ...p,
    price,
    stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 50,
    sold_count: p.sold_count !== undefined && p.sold_count !== null ? Number(p.sold_count) : 0,
    original_price: originalPrice,
    originalPrice: originalPrice,
    discount,
    features,
  };
};

// API 0: Trang chủ Backend - Danh sách kiểm tra nhanh API
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Test - ThoiTrangHD</title>
        <style>
          body {
            font-family: Consolas, Monaco, "Courier New", monospace, sans-serif;
            padding: 24px 16px;
            background: #fff;
            color: #222;
            max-width: 820px;
            margin: 0 auto;
          }
          h2 { margin: 0 0 4px 0; font-size: 20px; }
          .sub { color: #666; margin: 0 0 20px 0; font-size: 13px; }
          .group-title {
            font-weight: bold;
            margin-top: 18px;
            margin-bottom: 6px;
            font-size: 13px;
            color: #555;
            text-transform: uppercase;
          }
          .item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin-bottom: 5px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 13px;
            background: #fafafa;
          }
          .method {
            font-weight: bold;
            width: 65px;
            font-size: 12px;
          }
          .get { color: #0284c7; }
          .post { color: #16a34a; }
          .put { color: #d97706; }
          .delete { color: #dc2626; }
          .path {
            font-weight: 600;
            color: #111;
            text-decoration: none;
            margin-right: 12px;
          }
          a.path:hover {
            color: #0284c7;
            text-decoration: underline;
          }
          .desc {
            color: #666;
            font-size: 12px;
            margin-left: auto;
          }
        </style>
      </head>
      <body>
        <h2>API Server (ThoiTrangHD)</h2>
        <p class="sub">Port: 5000 &bull; Database: thoitranghd_db</p>

        <div class="group-title">Sản phẩm (Products)</div>
        <div class="item">
          <span class="method get">GET</span>
          <a class="path" href="/api/products" target="_blank">/api/products</a>
          <span class="desc">Lấy tất cả sản phẩm</span>
        </div>
        <div class="item">
          <span class="method get">GET</span>
          <a class="path" href="/api/products/1" target="_blank">/api/products/1</a>
          <span class="desc">Chi tiết sản phẩm #1</span>
        </div>

        <div class="group-title">Mã giảm giá (Vouchers)</div>
        <div class="item">
          <span class="method get">GET</span>
          <a class="path" href="/api/vouchers/HD10" target="_blank">/api/vouchers/HD10</a>
          <span class="desc">Test mã voucher HD10</span>
        </div>

        <div class="group-title">Đơn hàng (Orders)</div>
        <div class="item">
          <span class="method get">GET</span>
          <a class="path" href="/api/orders" target="_blank">/api/orders</a>
          <span class="desc">Danh sách đơn hàng</span>
        </div>
        <div class="item">
          <span class="method post">POST</span>
          <span class="path">/api/orders</span>
          <span class="desc">Tạo đơn hàng mới</span>
        </div>
        <div class="item">
          <span class="method put">PUT</span>
          <span class="path">/api/orders/:id/cancel</span>
          <span class="desc">Hủy đơn hàng</span>
        </div>

        <div class="group-title">Tài khoản (Auth)</div>
        <div class="item">
          <span class="method post">POST</span>
          <span class="path">/api/auth/register</span>
          <span class="desc">Đăng ký tài khoản</span>
        </div>
        <div class="item">
          <span class="method post">POST</span>
          <span class="path">/api/auth/login</span>
          <span class="desc">Đăng nhập</span>
        </div>
        <div class="item">
          <span class="method get">GET</span>
          <span class="path">/api/auth/profile/:id</span>
          <span class="desc">Lấy thông tin profile</span>
        </div>
        <div class="item">
          <span class="method put">PUT</span>
          <span class="path">/api/auth/profile/:id</span>
          <span class="desc">Cập nhật profile</span>
        </div>

        <div class="group-title">Yêu thích (Favorites)</div>
        <div class="item">
          <span class="method get">GET</span>
          <a class="path" href="/api/favorites" target="_blank">/api/favorites</a>
          <span class="desc">Danh sách yêu thích</span>
        </div>
        <div class="item">
          <span class="method post">POST</span>
          <span class="path">/api/favorites</span>
          <span class="desc">Thêm yêu thích</span>
        </div>
        <div class="item">
          <span class="method delete">DELETE</span>
          <span class="path">/api/favorites/:id</span>
          <span class="desc">Xóa khỏi yêu thích</span>
        </div>

        <div class="group-title">Đánh giá sản phẩm (Reviews)</div>
        <div class="item">
          <span class="method get">GET</span>
          <a class="path" href="/api/products/1/reviews" target="_blank">/api/products/1/reviews</a>
          <span class="desc">Đánh giá sản phẩm #1</span>
        </div>
        <div class="item">
          <span class="method post">POST</span>
          <span class="path">/api/products/:id/reviews</span>
          <span class="desc">Gửi đánh giá sản phẩm</span>
        </div>
        <div class="item">
          <span class="method get">GET</span>
          <span class="path">/api/orders/:id/reviewed-items</span>
          <span class="desc">Sản phẩm đã đánh giá          </a>
        </div>
        
        <div class="group-title">Upload (Hình ảnh)</div>
        <div class="item">
          <span class="method method-post">POST</span>
          <a class="path" href="#" onclick="alert('Dùng form data để test upload')">/api/upload</a>
        </div>
      </body>
    </html>
  `);
});

// API Upload ảnh
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh.' });
    }
    const imageUrl = '/uploads/' + req.file.filename;
    res.json({ success: true, url: imageUrl });
  } catch (err) {
    console.error('Lỗi upload ảnh:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi upload ảnh.' });
  }
});

// API 1: Lấy tất cả sản phẩm từ MySQL (hỗ trợ lọc theo category và search)
app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];
    const conditions = [];

    if (category && category !== 'Tất cả') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search && search.trim() !== '') {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY CAST(id AS UNSIGNED) ASC';

    const [rows] = await pool.query(query, params);
    const products = rows.map(formatProduct);
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server MySQL' });
  }
});

// API 2: Lấy chi tiết sản phẩm theo ID từ MySQL
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json({
        success: true,
        data: formatProduct(rows[0])
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }
  } catch (error) {
    console.error('Lỗi lấy sản phẩm theo ID:', error);
    res.status(500).json({ success: false, message: 'Lỗi server MySQL' });
  }
});

// API lấy tất cả danh sách vouchers công khai cho người dùng chọn
app.get('/api/vouchers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE (expires_at IS NULL OR expires_at > NOW()) ORDER BY value DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách vouchers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách voucher' });
  }
});

// API 3: Kiểm tra Voucher
app.get('/api/vouchers/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const orderTotal = req.query.orderTotal ? Number(req.query.orderTotal) : 0;
    
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE UPPER(code) = ?', [code]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mã khuyến mãi không tồn tại' });
    }

    const voucher = rows[0];

    // Kiểm tra ngày hết hạn
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi này đã hết hạn sử dụng' });
    }

    // Kiểm tra giới hạn lượt dùng
    if (voucher.usage_limit && voucher.times_used >= voucher.usage_limit) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã hết lượt sử dụng' });
    }

    // Kiểm tra hạng VIP yêu cầu
    if (voucher.min_vip_level > 0) {
      const userId = req.query.userId || null;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập để sử dụng mã VIP này' });
      }
      const [oRows] = await pool.query(
        "SELECT COALESCE(SUM(total_price), 0) as total_spent FROM orders WHERE user_id = ? AND status != 'Cancelled'",
        [userId]
      );
      const totalSpent = Number(oRows[0]?.total_spent || 0);
      let vipLevel = 0;
      if (totalSpent >= 2000000) vipLevel = 2; // Diamond
      else if (totalSpent >= 500000) vipLevel = 1; // Gold

      if (vipLevel < voucher.min_vip_level) {
        const requiredName = voucher.min_vip_level === 2 ? 'VIP Kim Cương' : 'VIP Vàng';
        return res.status(400).json({ 
          success: false, 
          message: `Mã này chỉ dành riêng cho hạng ${requiredName} trở lên.` 
        });
      }
    }

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (orderTotal > 0 && voucher.min_spend && orderTotal < voucher.min_spend) {
      const minVND = new Intl.NumberFormat('vi-VN').format(voucher.min_spend);
      return res.status(400).json({ 
        success: false, 
        message: `Mã này chỉ áp dụng cho đơn hàng từ ${minVND}đ trở lên` 
      });
    }

    res.json({ success: true, data: voucher });
  } catch (error) {
    console.error('Lỗi kiểm tra voucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi server MySQL' });
  }
});

// API 4: Tạo đơn hàng lưu vào MySQL kèm kiểm tra tồn kho & xác thực voucher
app.post('/api/orders', async (req, res) => {
  const userId = req.body.userId || req.body.user_id || null;
  const customerName = (req.body.customerName || req.body.customer_name || 'Khách hàng').trim();
  const customerPhone = (req.body.customerPhone || req.body.customer_phone || '').trim();
  const customerAddress = (req.body.customerAddress || req.body.customer_address || '').trim();
  const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'cod';
  let voucherCode = req.body.voucherCode || req.body.voucher_code || null;
  const orderNote = (req.body.orderNote || req.body.order_note || '').trim();
  const shippingFee = Math.max(0, Number(req.body.shippingFee || req.body.shipping_fee) || 0);
  const items = req.body.items || [];

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống, không thể tạo đơn hàng' });
  }

  if (!customerPhone || customerPhone.length < 9) {
    return res.status(400).json({ success: false, message: 'Số điện thoại nhận hàng không hợp lệ' });
  }

  if (!customerAddress || customerAddress.length < 5) {
    return res.status(400).json({ success: false, message: 'Địa chỉ giao hàng không hợp lệ' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Kiểm tra tồn kho cho tất cả sản phẩm
    let computedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const prodId = String(item.id || item.product_id);
      const qty = Math.max(1, Number(item.quantity) || 1);

      const [pRows] = await connection.query(
        'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE',
        [prodId]
      );

      if (pRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Sản phẩm #${prodId} không tồn tại trong hệ thống` });
      }

      const prod = pRows[0];
      const availableStock = prod.stock !== undefined && prod.stock !== null ? Number(prod.stock) : 50;

      if (availableStock < qty) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Sản phẩm "${prod.name}" trong kho chỉ còn ${availableStock} chiếc, không đủ số lượng bạn đặt (${qty} chiếc).` 
        });
      }

      const itemPrice = Number(prod.price);
      computedSubtotal += itemPrice * qty;

      validatedItems.push({
        id: prod.id,
        name: prod.name,
        price: itemPrice,
        quantity: qty,
        size: item.size || 'M',
        color: item.color || '#000000',
      });
    }

    // 2. Xác thực và tính toán giảm giá Voucher (Server-side validation)
    let validatedDiscount = 0;
    if (voucherCode && String(voucherCode).trim()) {
      const cleanCode = String(voucherCode).trim().toUpperCase();
      const [vRows] = await connection.query(
        'SELECT * FROM vouchers WHERE UPPER(code) = ? FOR UPDATE',
        [cleanCode]
      );

      if (vRows.length > 0) {
        const v = vRows[0];
        const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
        const isExhausted = v.usage_limit && v.times_used >= v.usage_limit;
        const isUnderMinSpend = v.min_spend && computedSubtotal < v.min_spend;

        if (!isExpired && !isExhausted && !isUnderMinSpend) {
          // Kiểm tra hạng VIP
          let isValidVip = true;
          if (v.min_vip_level > 0) {
            if (!userId) {
              isValidVip = false;
            } else {
              const [oRows] = await connection.query(
                "SELECT COALESCE(SUM(total_price), 0) as total_spent FROM orders WHERE user_id = ? AND status != 'Cancelled'",
                [userId]
              );
              const totalSpent = Number(oRows[0]?.total_spent || 0);
              let vipLevel = 0;
              if (totalSpent >= 2000000) vipLevel = 2; // Diamond
              else if (totalSpent >= 500000) vipLevel = 1; // Gold

              if (vipLevel < v.min_vip_level) {
                isValidVip = false;
              }
            }
          }

          if (isValidVip) {
            if (v.discount_type === 'percent') {
              validatedDiscount = Math.round((computedSubtotal * Number(v.value)) / 100);
            } else {
              validatedDiscount = Math.min(Number(v.value), computedSubtotal);
            }
            // Tăng số lượt đã sử dụng của voucher
            await connection.query('UPDATE vouchers SET times_used = times_used + 1 WHERE code = ?', [v.code]);
          } else {
            // Nếu không đủ điều kiện VIP, hủy voucher code
            voucherCode = null;
          }
        }
      }
    }

    const validatedTotalPrice = Math.max(0, computedSubtotal - validatedDiscount) + shippingFee;
    const orderCode = 'HD' + Date.now().toString().slice(-6);

    // 3. Tạo bản ghi đơn hàng
    const [result] = await connection.query(
      `INSERT INTO orders (user_id, order_code, customer_name, customer_phone, customer_address, payment_method, voucher_code, subtotal, discount_amount, shipping_fee, total_price, order_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [userId, orderCode, customerName, customerPhone, customerAddress, paymentMethod, (voucherCode && String(voucherCode).trim()) ? String(voucherCode).trim().toUpperCase() : null, computedSubtotal, validatedDiscount, shippingFee, validatedTotalPrice, orderNote || null]
    );

    const orderId = result.insertId;

    // 4. Lưu từng sản phẩm và trừ tồn kho, tăng số lượng đã bán (sold_count)
    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.price, item.quantity, item.size, item.color]
      );

      // Trừ tồn kho và tăng lượt bán
      await connection.query(
        'UPDATE products SET stock = GREATEST(0, stock - ?), sold_count = sold_count + ? WHERE id = ?',
        [item.quantity, item.quantity, item.id]
      );
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      orderCode,
      orderId,
      totalPrice: validatedTotalPrice,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi tạo đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Không thể lưu đơn hàng vào database' });
  } finally {
    connection.release();
  }
});

// API 5: Lấy danh sách đơn hàng (lọc theo userId nếu có)
app.get('/api/orders', async (req, res) => {
  try {
    const userId = req.query.userId || req.query.user_id;
    let query = 'SELECT * FROM orders';
    const params = [];

    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    } else {
      query += ' WHERE user_id IS NULL';
    }

    query += ' ORDER BY created_at DESC';

    const [orders] = await pool.query(query, params);
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.image 
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server MySQL' });
  }
});

// API 6: Lấy chi tiết đơn hàng theo ID hoặc order_code
app.get('/api/orders/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    let query = 'SELECT * FROM orders WHERE id = ?';
    let param = identifier;

    // If not a number, search by order_code
    if (isNaN(Number(identifier))) {
      query = 'SELECT * FROM orders WHERE order_code = ?';
    }

    const [orders] = await pool.query(query, [param]);
    if (orders.length > 0) {
      const order = orders[0];
      const [items] = await pool.query(
        `SELECT oi.*, p.image 
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
      res.json({ success: true, data: order });
    } else {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server MySQL' });
  }
});

// API 6.1: Hủy đơn hàng (nếu đang ở trạng thái Pending) và hoàn trả tồn kho
app.put('/api/orders/:identifier/cancel', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const identifier = req.params.identifier;

    // 1. Kiểm tra đơn hàng có tồn tại và đang Pending không
    let query = 'SELECT id, status, voucher_code FROM orders WHERE id = ? FOR UPDATE';
    if (isNaN(Number(identifier))) {
      query = 'SELECT id, status, voucher_code FROM orders WHERE order_code = ? FOR UPDATE';
    }
    const [orders] = await connection.query(query, [identifier]);

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[0];
    if (order.status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái "Chờ xác nhận"' 
      });
    }

    // 2. Lấy danh sách sản phẩm trong đơn để hoàn trả kho
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [order.id]
    );

    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ?, sold_count = GREATEST(0, sold_count - ?) WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    const cancelReason = (req.body.cancelReason || req.body.cancel_reason || 'Khách hàng yêu cầu hủy đơn').trim();

    // 3. Cập nhật trạng thái thành Cancelled
    await connection.query("UPDATE orders SET status = 'Cancelled', cancel_reason = ? WHERE id = ?", [cancelReason, order.id]);

    // 4. Hoàn trả lượt dùng voucher nếu có
    if (order.voucher_code) {
      await connection.query('UPDATE vouchers SET times_used = GREATEST(0, times_used - 1) WHERE code = ?', [order.voucher_code]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Hủy đơn hàng và hoàn kho thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi hủy đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi hủy đơn' });
  } finally {
    connection.release();
  }
});

// API 7: Đăng ký người dùng
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký' });
    }

    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password, avatar) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : '', password, defaultAvatar]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      avatar: defaultAvatar,
      address: ''
    };

    res.json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: user
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký' });
  }
});

// API 8: Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, phone, avatar, address, COALESCE(role, 'user') as role, created_at FROM users WHERE email = ? AND password = ?",
      [email.trim().toLowerCase(), password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    const user = rows[0];
    const [oRows] = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0) as total_spent FROM orders WHERE user_id = ? AND status != 'Cancelled'",
      [user.id]
    );
    user.total_spent = Number(oRows[0]?.total_spent || 0);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: user
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập' });
  }
});

// API 9: Lấy thông tin người dùng
app.get('/api/auth/profile/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, avatar, address, COALESCE(role, 'user') as role, created_at FROM users WHERE id = ?",
      [req.params.id]
    );
    if (rows.length > 0) {
      const user = rows[0];
      const [oRows] = await pool.query(
        "SELECT COALESCE(SUM(total_price), 0) as total_spent FROM orders WHERE user_id = ? AND status != 'Cancelled'",
        [user.id]
      );
      user.total_spent = Number(oRows[0]?.total_spent || 0);
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
  } catch (error) {
    console.error('Lỗi lấy profile:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 10: Cập nhật hồ sơ người dùng
app.put('/api/auth/profile/:id', async (req, res) => {
  try {
    const { name, phone, email, address, avatar } = req.body;
    const userId = req.params.id;

    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address), avatar = COALESCE(?, avatar) WHERE id = ?',
      [name, phone, email, address, avatar, userId]
    );

    const [rows] = await pool.query(
      "SELECT id, name, email, phone, avatar, address, COALESCE(role, 'user') as role, created_at FROM users WHERE id = ?",
      [userId]
    );

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: rows[0]
    });
  } catch (error) {
    console.error('Lỗi cập nhật profile:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật' });
  }
});

// API 11: Lấy danh sách sản phẩm yêu thích
app.get('/api/favorites', async (req, res) => {
  try {
    const userId = req.query.userId || null;
    let query = `
      SELECT f.id as favorite_id, f.user_id, f.product_id, f.created_at,
             p.name, p.price, p.image, p.category, p.discount, p.original_price
      FROM favorites f
      JOIN products p ON f.product_id = p.id
    `;
    const params = [];
    if (userId) {
      query += ' WHERE f.user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY f.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách yêu thích:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy yêu thích' });
  }
});

// API 12: Thêm vào yêu thích
app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã sản phẩm' });
    }

    // Check if already in favorites
    const [existing] = await pool.query(
      'SELECT id FROM favorites WHERE product_id = ? AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))',
      [productId, userId || null, userId || null]
    );

    if (existing.length === 0) {
      await pool.query('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)', [userId || null, productId]);
    }

    res.json({ success: true, message: 'Đã thêm vào yêu thích' });
  } catch (error) {
    console.error('Lỗi thêm yêu thích:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 13: Xóa khỏi yêu thích
app.delete('/api/favorites/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.query.userId || null;

    if (userId) {
      await pool.query('DELETE FROM favorites WHERE product_id = ? AND user_id = ?', [productId, userId]);
    } else {
      await pool.query('DELETE FROM favorites WHERE product_id = ?', [productId]);
    }

    res.json({ success: true, message: 'Đã xóa khỏi yêu thích' });
  } catch (error) {
    console.error('Lỗi xóa yêu thích:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 14: Lấy danh sách đánh giá của sản phẩm kèm thống kê
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const [reviews] = await pool.query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [productId]
    );

    const totalReviews = reviews.length;
    let averageRating = 5.0;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, r) => {
        const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
        ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
        return acc + Number(r.rating || 5);
      }, 0);
      averageRating = Number((sum / totalReviews).toFixed(1));
    }

    res.json({
      success: true,
      data: reviews,
      stats: {
        averageRating,
        totalReviews,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đánh giá:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy đánh giá' });
  }
});

// API 15: Gửi đánh giá sản phẩm mới
app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const { userId, userName, userAvatar, rating, comment, orderId, size, color } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung đánh giá' });
    }

    // 1. Chặn đánh giá trùng lặp cho cùng một đơn hàng và sản phẩm
    if (orderId) {
      const [existing] = await pool.query(
        'SELECT id FROM reviews WHERE order_id = ? AND product_id = ?',
        [orderId, productId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng này rồi' 
        });
      }
    }

    // 2. Xác thực đã mua hàng (is_verified_purchase)
    let isVerifiedPurchase = 0;
    if (orderId) {
      const [ordRows] = await pool.query(
        "SELECT id FROM orders WHERE id = ? AND status = 'Completed'",
        [orderId]
      );
      if (ordRows.length > 0) {
        isVerifiedPurchase = 1;
      }
    } else if (userId) {
      const [boughtRows] = await pool.query(
        `SELECT o.id FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'Completed'`,
        [userId, productId]
      );
      if (boughtRows.length > 0) {
        isVerifiedPurchase = 1;
      }
    }

    const name = (userName && userName.trim()) || 'Khách hàng';
    const avatar = userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
    const starRating = Math.round(Number(rating));

    const [result] = await pool.query(
      `INSERT INTO reviews (product_id, user_id, user_name, user_avatar, rating, comment, order_id, size, color, is_verified_purchase)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, userId || null, name, avatar, starRating, comment.trim(), orderId || null, size || null, color || null, isVerifiedPurchase]
    );

    const [newReviewRows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      message: 'Gửi đánh giá sản phẩm thành công!',
      data: newReviewRows[0]
    });
  } catch (error) {
    console.error('Lỗi gửi đánh giá:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu đánh giá' });
  }
});

// API 16: Lấy danh sách product_id đã đánh giá của 1 đơn hàng
app.get('/api/orders/:id/reviewed-items', async (req, res) => {
  try {
    const orderId = req.params.id;
    const [rows] = await pool.query(
      'SELECT product_id FROM reviews WHERE order_id = ?',
      [orderId]
    );
    const reviewedProductIds = rows.map(r => String(r.product_id));
    res.json({
      success: true,
      data: reviewedProductIds
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin đã đánh giá của đơn:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 17: Thống kê nâng cao dành cho Admin Dashboard
app.get('/api/admin/stats', async (req, res) => {
  try {
    // 1. Doanh thu tổng (các đơn không bị hủy)
    const [revRows] = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0) as totalRevenue FROM orders WHERE status != 'Cancelled'"
    );
    const totalRevenue = Number(revRows[0].totalRevenue) || 0;

    // 2. Doanh thu hôm nay
    const [todayRevRows] = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0) as todayRevenue, COUNT(*) as todayOrders FROM orders WHERE status != 'Cancelled' AND DATE(created_at) = CURDATE()"
    );
    const todayRevenue = Number(todayRevRows[0].todayRevenue) || 0;
    const todayOrders = Number(todayRevRows[0].todayOrders) || 0;

    // 3. Tổng số đơn hàng và phân bố trạng thái
    const [orderRows] = await pool.query(
      `SELECT COUNT(*) as totalOrders, 
              SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingOrders, 
              SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedOrders, 
              SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledOrders, 
              SUM(CASE WHEN status = 'Processing' THEN 1 ELSE 0 END) as processingOrders 
       FROM orders`
    );
    const totalOrders = Number(orderRows[0].totalOrders) || 0;
    const pendingOrders = Number(orderRows[0].pendingOrders) || 0;
    const completedOrders = Number(orderRows[0].completedOrders) || 0;
    const cancelledOrders = Number(orderRows[0].cancelledOrders) || 0;
    const processingOrders = Number(orderRows[0].processingOrders) || 0;

    // 4. Tổng số người dùng
    const [userRows] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const totalUsers = Number(userRows[0].totalUsers) || 0;

    // 5. Tổng số sản phẩm
    const [prodRows] = await pool.query('SELECT COUNT(*) as totalProducts FROM products');
    const totalProducts = Number(prodRows[0].totalProducts) || 0;

    // 6. 5 đơn hàng mới nhất
    const [recentOrders] = await pool.query(
      'SELECT id, order_code, customer_name, customer_phone, total_price, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5'
    );

    // 7. Doanh thu 7 ngày gần nhất (Daily Revenue Chart)
    const [dailyRows] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, 
             DATE_FORMAT(created_at, '%d/%m') as label, 
             COALESCE(SUM(total_price), 0) as revenue,
             COUNT(*) as order_count
      FROM orders
      WHERE status != 'Cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%Y-%m-%d'), DATE_FORMAT(created_at, '%d/%m')
      ORDER BY date ASC
    `);

    // Tạo đủ 7 ngày liên tục
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = `${dd}/${mm}`;
      const found = dailyRows.find(r => r.date === dateStr);
      last7Days.push({
        date: dateStr,
        label: label,
        revenue: found ? Number(found.revenue) : 0,
        orders: found ? Number(found.order_count) : 0,
      });
    }

    // 8. Top 5 sản phẩm bán chạy nhất
    const [topProducts] = await pool.query(`
      SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as sold_count, SUM(oi.price * oi.quantity) as revenue, p.image, p.category
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'Cancelled'
      GROUP BY oi.product_id, oi.product_name, p.image, p.category
      ORDER BY sold_count DESC
      LIMIT 5
    `);

    // 9. Phân bố theo danh mục
    const [categoryRows] = await pool.query(`
      SELECT category, COUNT(*) as count FROM products GROUP BY category
    `);

    res.json({
      success: true,
      data: {
        totalRevenue,
        todayRevenue,
        todayOrders,
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        cancelledOrders,
        totalUsers,
        totalProducts,
        recentOrders,
        dailyRevenue: last7Days,
        topProducts,
        categoryStats: categoryRows,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê admin:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy thống kê' });
  }
});

// API 18: Lấy toàn bộ danh sách đơn hàng cho Admin
app.get('/api/admin/orders', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL' && status !== 'TẤT CẢ') {
      query += ' AND LOWER(status) = LOWER(?)';
      params.push(status);
    }

    if (search && search.trim()) {
      query += ' AND (order_code LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY created_at DESC';

    const [orders] = await pool.query(query, params);
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.image 
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng admin:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 19: Cập nhật trạng thái đơn hàng (Admin) kèm quản lý hoàn/trừ tồn kho
app.put('/api/admin/orders/:id/status', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu trạng thái đơn hàng' });
    }

    const [currOrder] = await connection.query('SELECT status, voucher_code FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (currOrder.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const oldStatus = currOrder[0].status;
    const voucherCode = currOrder[0].voucher_code;

    // Nếu chuyển sang Cancelled và trước đó chưa phải Cancelled -> Hoàn trả tồn kho
    if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
      const [items] = await connection.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock + ?, sold_count = GREATEST(0, sold_count - ?) WHERE id = ?',
          [item.quantity, item.quantity, item.product_id]
        );
      }
      if (voucherCode) {
        await connection.query('UPDATE vouchers SET times_used = GREATEST(0, times_used - 1) WHERE code = ?', [voucherCode]);
      }
    } 
    // Nếu chuyển từ Cancelled sang trạng thái khác -> Trừ lại tồn kho
    else if (oldStatus === 'Cancelled' && status !== 'Cancelled') {
      const [items] = await connection.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = GREATEST(0, stock - ?), sold_count = sold_count + ? WHERE id = ?',
          [item.quantity, item.quantity, item.product_id]
        );
      }
      if (voucherCode) {
        await connection.query('UPDATE vouchers SET times_used = times_used + 1 WHERE code = ?', [voucherCode]);
      }
    }

    await connection.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    await connection.commit();
    const statusVi = status === 'Processing' ? 'Đang giao' : status === 'Completed' ? 'Hoàn thành' : status === 'Cancelled' ? 'Đã hủy' : 'Chờ xác nhận';

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng thành "${statusVi}"`,
      data: { id: orderId, status },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi cập nhật trạng thái đơn:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đổi trạng thái' });
  } finally {
    connection.release();
  }
});

// API 20: Lấy danh sách người dùng cho Admin
app.get('/api/admin/users', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar, u.address, COALESCE(u.role, 'user') as role, u.created_at,
             COUNT(o.id) as order_count,
             COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_price ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách người dùng admin:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 20.1: Đổi quyền người dùng (User Role)
app.put('/api/admin/users/:id/role', async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin quyền' });
    }
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({
      success: true,
      message: `Đã cập nhật vai trò thành viên thành "${role}"`,
    });
  } catch (error) {
    console.error('Lỗi cập nhật role:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đổi role' });
  }
});

// API 21: Thêm mới sản phẩm (Admin)
app.post('/api/admin/products', async (req, res) => {
  try {
    const { name, price, original_price, discount, category, image, description } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên và giá sản phẩm' });
    }

    const id = 'prod_' + Date.now();
    const finalOriginalPrice = original_price ? Number(original_price) : Number(price);
    const finalDiscount = discount ? Number(discount) : 0;

    await pool.query(
      `INSERT INTO products (id, name, price, original_price, discount, category, image, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, Number(price), finalOriginalPrice, finalDiscount, category || 'Khác', image || '', description || '']
    );

    res.json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data: { id, name, price: Number(price), category, image },
    });
  } catch (error) {
    console.error('Lỗi thêm sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi thêm sản phẩm' });
  }
});

// API 22: Cập nhật sản phẩm (Admin)
app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const prodId = req.params.id;
    const { name, price, original_price, discount, category, image, description } = req.body;

    const [result] = await pool.query(
      `UPDATE products 
       SET name = COALESCE(?, name),
           price = COALESCE(?, price),
           original_price = COALESCE(?, original_price),
           discount = COALESCE(?, discount),
           category = COALESCE(?, category),
           image = COALESCE(?, image),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [name, price ? Number(price) : null, original_price ? Number(original_price) : null, discount ? Number(discount) : null, category, image, description, prodId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
    });
  } catch (error) {
    console.error('Lỗi cập nhật sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật sản phẩm' });
  }
});

// API 23: Xóa sản phẩm (Admin)
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const prodId = req.params.id;
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [prodId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    res.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('Lỗi xóa sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Không thể xóa sản phẩm (có thể đã có đơn hàng tham chiếu)' });
  }
});

// API 24: Lấy danh sách vouchers (Admin)
app.get('/api/admin/vouchers', async (req, res) => {
  try {
    const [vouchers] = await pool.query('SELECT * FROM vouchers');
    res.json({
      success: true,
      data: vouchers,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách vouchers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API 25: Tạo voucher mới (Admin)
app.post('/api/admin/vouchers', async (req, res) => {
  try {
    const { code, discount_type, value, usage_limit, min_vip_level } = req.body;
    if (!code || !discount_type || value === undefined) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin voucher' });
    }
    await pool.query(
      'INSERT INTO vouchers (code, discount_type, value, usage_limit, min_vip_level) VALUES (?, ?, ?, ?, ?)',
      [code.toUpperCase().trim(), discount_type, Number(value), usage_limit ? Number(usage_limit) : null, min_vip_level ? Number(min_vip_level) : 0]
    );
    res.json({
      success: true,
      message: `Đã tạo voucher ${code.toUpperCase()} thành công`,
    });
  } catch (error) {
    console.error('Lỗi tạo voucher:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Mã voucher này đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo voucher' });
  }
});

// API 26: Xóa voucher (Admin)
app.delete('/api/admin/vouchers/:code', async (req, res) => {
  try {
    const code = req.params.code;
    await pool.query('DELETE FROM vouchers WHERE code = ?', [code]);
    res.json({
      success: true,
      message: `Đã xóa mã voucher ${code}`,
    });
  } catch (error) {
    console.error('Lỗi xóa voucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa voucher' });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`🚀 Backend Server (MySQL Connected) đang chạy tại: http://localhost:${port}`);
  console.log(`👉 API Danh sách sản phẩm: http://localhost:${port}/api/products`);
});
