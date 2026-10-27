const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
};

const VIETNAMESE_ADDRESSES = [
  'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
  'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
  '124 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng',
  '88 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
  'Số 45 Trần Phú, Ngô Quyền, Hải Phòng',
  'Số 234 Quang Trung, Phường 10, Gò Vấp, TP.HCM',
  'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
  'Số 56 Nguyễn Trãi, Thanh Xuân, Hà Nội',
  'Số 102 Lê Duẩn, Tân Chính, Thanh Khê, Đà Nẵng',
  'Số 78 Đại Lộ Bình Dương, Phú Hòa, Thủ Dầu Một, Bình Dương',
  'Số 15 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
  'Số 332 Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội',
  'Số 68 Đinh Tiên Hoàng, Đa Kao, Quận 1, TP.HCM',
  'Số 91 Hùng Vương, Phường 4, Quận 5, TP.HCM',
  'Số 420 Xã Đàn, Nam Đồng, Đống Đa, Hà Nội'
];

const CANCEL_REASONS = [
  'Đặt nhầm size, muốn đổi sang size khác',
  'Tôi muốn thay đổi địa chỉ nhận hàng',
  'Đổi ý muốn mua mẫu màu khác',
  'Tìm được sản phẩm khác phù hợp hơn',
  'Thời gian giao hàng dự kiến hơi lâu',
  'Đặt trùng đơn hàng',
  'Thay đổi phương thức thanh toán sang chuyển khoản',
  'Có việc bận đột xuất đi công tác không nhận được hàng',
  'Tài chính chưa thuận tiện lúc này'
];

const ORDER_NOTES = [
  'Giao trong giờ hành chính giúp mình',
  'Gọi trước khi giao 15 phút nhé',
  'Đóng gói cẩn thận làm quà tặng',
  'Nếu không gọi được vui lòng gửi ở quầy lễ tân chung cư',
  'Giao buổi chiều sau 14h',
  'Cho xem hàng trước khi nhận',
  'Đã chuyển khoản VietQR, shop kiểm tra duyệt sớm ạ',
  'Shop che tên sản phẩm giúp mình nhé'
];

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const COLORS = ['Đen', 'Trắng', 'Xám tiêu', 'Xanh navy', 'Be vintage', 'Nâu cafe', 'Rêu đậm'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderCode() {
  const chars = '0123456789';
  let num = '';
  for (let i = 0; i < 6; i++) {
    num += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'HD' + num;
}

async function expandOrders() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Kết nối CSDL thoitranghd_db thành công.');

    // 1. Lấy danh sách users và products
    const [users] = await connection.query('SELECT id, name, email, phone FROM users WHERE role != "admin"');
    const [products] = await connection.query('SELECT id, name, price, image FROM products WHERE stock > 0');

    if (users.length === 0 || products.length === 0) {
      console.error('❌ Không tìm thấy user hoặc sản phẩm để tạo đơn.');
      return;
    }

    console.log(`Tìm thấy ${users.length} khách hàng và ${products.length} sản phẩm.`);

    // 2. Kiểm tra số lượng hiện tại theo từng status
    const [currentCounts] = await connection.query(`
      SELECT status, COUNT(*) as cnt FROM orders GROUP BY status
    `);
    
    const countMap = {
      Pending: 0,
      Processing: 0,
      Completed: 0,
      Cancelled: 0
    };
    currentCounts.forEach(c => {
      countMap[c.status] = c.cnt;
    });

    console.log('📊 Số lượng đơn hàng hiện tại:', countMap);

    const TARGET_MIN = 35; // Đảm bảo mỗi mục ít nhất 35 bản ghi (vượt mức 30 yêu cầu)

    const statusesToFill = ['Pending', 'Processing', 'Cancelled'];

    for (const status of statusesToFill) {
      const current = countMap[status] || 0;
      const needToAdd = Math.max(0, TARGET_MIN - current);
      console.log(`\n--- Trạng thái: [${status}] (Hiện có: ${current}, Cần thêm: ${needToAdd}) ---`);

      for (let i = 0; i < needToAdd; i++) {
        // Luân phiên gán cho User 1, User 2 (để khi đăng nhập app bằng tài khoản khách test cũng thấy)
        // và các user khác để admin thấy phong phú khách hàng
        let user;
        if (i % 4 === 0) {
          user = users.find(u => u.id === 1) || users[0];
        } else if (i % 4 === 1) {
          user = users.find(u => u.id === 2) || users[1];
        } else {
          user = getRandomItem(users);
        }

        const isBank = Math.random() > 0.45;
        const paymentMethod = isBank ? 'bank' : 'cod';
        
        let paymentStatus = 'unpaid';
        if (status === 'Pending') {
          paymentStatus = isBank ? (Math.random() > 0.5 ? 'paid_pending_verification' : 'pending') : 'unpaid';
        } else if (status === 'Processing') {
          paymentStatus = isBank ? 'paid' : 'unpaid';
        } else if (status === 'Cancelled') {
          paymentStatus = 'unpaid';
        } else {
          paymentStatus = 'paid';
        }

        // Chọn ngẫu nhiên 1 - 3 sản phẩm cho đơn hàng
        const itemCount = getRandomInt(1, 3);
        const orderItems = [];
        let subtotal = 0;

        for (let j = 0; j < itemCount; j++) {
          const prod = getRandomItem(products);
          const qty = getRandomInt(1, 2);
          const size = getRandomItem(SIZES);
          const color = getRandomItem(COLORS);
          const price = Number(prod.price) || 250000;
          subtotal += price * qty;

          orderItems.push({
            productId: String(prod.id),
            productName: prod.name,
            price: price,
            quantity: qty,
            size: size,
            color: color
          });
        }

        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const discountAmount = Math.random() > 0.6 ? (Math.random() > 0.5 ? 50000 : 20000) : 0;
        const totalPrice = Math.max(0, subtotal - discountAmount + shippingFee);

        // Tạo ngày tạo đơn (trong vòng 15 ngày qua)
        const daysAgo = status === 'Pending' ? getRandomInt(0, 2) :
                        status === 'Processing' ? getRandomInt(2, 6) :
                        status === 'Cancelled' ? getRandomInt(1, 14) : getRandomInt(7, 30);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - getRandomInt(10, 100000) * 1000);

        // Mã đơn hàng duy nhất
        let orderCode = generateOrderCode();
        let isUnique = false;
        while (!isUnique) {
          const [exists] = await connection.query('SELECT id FROM orders WHERE order_code = ?', [orderCode]);
          if (exists.length === 0) {
            isUnique = true;
          } else {
            orderCode = generateOrderCode();
          }
        }

        const customerAddress = getRandomItem(VIETNAMESE_ADDRESSES);
        const orderNote = Math.random() > 0.4 ? getRandomItem(ORDER_NOTES) : null;
        const cancelReason = status === 'Cancelled' ? getRandomItem(CANCEL_REASONS) : null;

        // Chèn vào bảng orders
        const [res] = await connection.query(
          `INSERT INTO orders 
          (user_id, order_code, customer_name, customer_phone, customer_address, payment_method, voucher_code, subtotal, discount_amount, shipping_fee, total_price, order_note, status, cancel_reason, payment_status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            orderCode,
            user.name || 'Khách hàng',
            user.phone || '0987654321',
            customerAddress,
            paymentMethod,
            discountAmount > 0 ? (discountAmount === 50000 ? 'HDVIP50K' : 'HDNEW20K') : null,
            subtotal,
            discountAmount,
            shippingFee,
            totalPrice,
            orderNote,
            status,
            cancelReason,
            paymentStatus,
            createdAt
          ]
        );

        const orderId = res.insertId;

        // Chèn vào bảng order_items
        for (const item of orderItems) {
          await connection.query(
            `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, size, color)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, item.productId, item.productName, item.price, item.quantity, item.size, item.color]
          );
        }
      }
    }

    // 3. Kiểm tra lại kết quả sau khi thêm
    const [finalCounts] = await connection.query(`
      SELECT status, COUNT(*) as cnt FROM orders GROUP BY status
    `);
    console.log('\n🎉 ================= KẾT QUẢ CẬP NHẬT =================');
    console.log(finalCounts);
    console.log('=======================================================\n');

  } catch (err) {
    console.error('❌ Lỗi khi mở rộng dữ liệu đơn hàng:', err);
  } finally {
    if (connection) await connection.end();
  }
}

expandOrders();
