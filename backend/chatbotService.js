/**
 * CHATBOT AI SERVICE - THOITRANGHD
 * Hybrid Context-Aware RAG & Smart Mobile Rule Engine
 */

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim();
}

// 1. Phân tích tư vấn chọn size
function analyzeSize(message) {
  const norm = normalizeText(message);

  let height = null;
  const h1Match = message.match(/(?:cao\s*)?([12])[m|.,]([0-9]{1,2})(?:\s*m)?/i);
  const h2Match = message.match(/(?:cao\s*)?([12][0-9]{2})\s*(?:cm)?/i);
  const h3Match = message.match(/cao\s*([12][0-9]{2})/i);
  const h4Match = message.match(/\bm([5-9][0-9]?)\b/i);
  
  if (h1Match) {
    const meter = parseInt(h1Match[1], 10);
    const cmPart = h1Match[2].padEnd(2, '0');
    height = meter * 100 + parseInt(cmPart.slice(0, 2), 10);
  } else if (h2Match) {
    height = parseInt(h2Match[1], 10);
  } else if (h3Match) {
    height = parseInt(h3Match[1], 10);
  } else if (h4Match) {
    const part = h4Match[1];
    if (part.length === 1) {
      height = 100 + parseInt(part, 10) * 10; // m7 -> 170, m8 -> 180, m6 -> 160
    } else {
      height = 100 + parseInt(part, 10); // m72 -> 172, m68 -> 168
    }
  }

  // Cân nặng: BẮT BUỘC có đơn vị kg/kí/cân HOẶC từ "nặng" phía trước để tránh nhầm mã đơn hàng
  let weight = null;
  const w1Match = message.match(/([3-9][0-9]|1[0-4][0-9])\s*(?:kg|k[ií]|c[aâ]n)\b/i);
  const w2Match = message.match(/n[a|ặ]ng\s*([3-9][0-9]|1[0-4][0-9])/i);
  if (w1Match) {
    weight = parseInt(w1Match[1], 10);
  } else if (w2Match) {
    weight = parseInt(w2Match[1], 10);
  }

  const isAskingSizeGeneral = norm.includes('size') || norm.includes('kich co') || norm.includes('tu van size') || norm.includes('bang size') || norm.includes('chon size');

  if (!height && !weight && isAskingSizeGeneral) {
    return {
      type: 'guide',
      reply: '📏 **BẢNG HƯỚNG DẪN CHỌN SIZE CHUẨN THOITRANGHD:**\n\n' +
        '• **Size S**: Dưới 1m62 & dưới 53kg (Quần 28 - 29)\n' +
        '• **Size M**: 1m60 - 1m68 & 53 - 62kg (Quần 29 - 30)\n' +
        '• **Size L**: 1m68 - 1m75 & 62 - 70kg (Quần 31 - 32)\n' +
        '• **Size XL**: 1m73 - 1m80 & 70 - 78kg (Quần 32 - 33)\n' +
        '• **Size XXL**: 1m78 - 1m88 & 78 - 88kg (Quần 34 - 36)\n' +
        '• **Size 3XL**: Trên 1m80 hoặc trên 88kg\n\n' +
        '👉 **Để em tư vấn chuẩn 100%**, bạn vui lòng nhập **chiều cao và cân nặng** (Ví dụ: *Cao 1m70 nặng 65kg*) nhé! ✨',
      suggested_actions: ['Cao 1m70 nặng 65kg', 'Cao 1m65 nặng 55kg', 'Cao 1m75 nặng 72kg', 'Xem áo Polo', 'Xem quần Jean']
    };
  }

  if (height || weight) {
    const h = height || 168;
    const w = weight || 62;

    let size = 'L';
    let pantSize = '31 - 32';

    if (w < 53 || (h < 162 && w < 55)) {
      size = 'S';
      pantSize = '28 - 29';
    } else if (w <= 62 && h <= 168) {
      size = 'M';
      pantSize = '29 - 30';
    } else if (w <= 70 && h <= 175) {
      size = 'L';
      pantSize = '31 - 32';
    } else if (w <= 78 && h <= 180) {
      size = 'XL';
      pantSize = '32 - 33';
    } else if (w <= 88) {
      size = 'XXL';
      pantSize = '34 - 36';
    } else {
      size = '3XL';
      pantSize = '36+';
    }

    const isLoose = norm.includes('rong') || norm.includes('oversize') || norm.includes('thung thinh') || norm.includes('thoai mai');
    const isTight = norm.includes('om') || norm.includes('body') || norm.includes('slim');

    let styleNote = '';
    if (isLoose) {
      styleNote = '👕 Vì bạn chuộng phong cách form rộng (Oversize / Streetwear), bạn có thể chọn tăng lên 1 size nữa để mặc thoải mái và chuẩn form nhé!';
    } else if (isTight) {
      styleNote = '👕 Với dáng ôm vừa vặn (Slimfit / Body), size này sẽ tôn chuẩn đường nét vóc dáng của bạn!';
    } else {
      styleNote = '💡 Mẹo: Nếu bạn thích mặc dáng suông thoải mái (Oversize), có thể cân nhắc tăng 1 size so với bảng tiêu chuẩn nhé!';
    }

    const reply = '🎯 **KẾT QUẢ TƯ VẤN SIZE CHO BẠN:**\n\n' +
      `• Chiều cao: **${height ? height + ' cm' : 'Ước tính ~1m68'}**\n` +
      `• Cân nặng: **${weight ? weight + ' kg' : 'Ước tính ~62kg'}**\n\n` +
      `👉 **Size áo đề xuất: SIZE ${size}** (Áo thun, Polo, Sơ mi, Hoodie)\n` +
      `👉 **Size quần đề xuất: Size ${pantSize}** (Jean, Kaki, Short)\n\n` +
      `${styleNote}\n\n` +
      '✨ ThoiTrangHD cam kết **hỗ trợ đổi size MIỄN PHÍ trong 7 ngày** nếu bạn mặc chưa vừa vặn, hãy an tâm đặt hàng nhé!';

    return {
      type: 'calculated',
      reply,
      data: {
        height: h,
        weight: w,
        recommended_size: size,
        pant_size: pantSize
      },
      suggested_actions: [`Xem áo size ${size}`, 'Xem quần Jean', 'Săn mã giảm giá', 'Tra cứu đơn hàng']
    };
  }

  return null;
}

// 2. Tra cứu đơn hàng
async function handleOrderTracking(pool, message, userId) {
  const norm = normalizeText(message);
  
  // Phát hiện mã đơn: HD804558, #55, đơn 55, mã 55...
  let orderQueryVal = null;
  const hdMatch = message.match(/(?:HD)([0-9]{2,8})/i);
  const hashMatch = message.match(/#([0-9]{1,8})/);
  const donMatch = message.match(/(?:dons*hang|don|mas*don|ma)s*#?([0-9]{1,8})/i);
  const pureNum = message.trim().match(/^([0-9]{1,8})$/);

  if (hdMatch) {
    orderQueryVal = hdMatch[1];
  } else if (hashMatch) {
    orderQueryVal = hashMatch[1];
  } else if (donMatch) {
    orderQueryVal = donMatch[1];
  } else if (pureNum && (norm.includes('hd') || norm.includes('don') || message.trim().length <= 6)) {
    orderQueryVal = pureNum[1];
  }

  if (orderQueryVal) {
    // Ưu tiên trùng khớp chính xác ID hoặc exact order_code
    const [orders] = await pool.query(
      `SELECT * FROM orders 
       WHERE id = ? OR order_code = ? OR order_code = ? OR order_code LIKE ?
       ORDER BY (id = ?) DESC, (order_code = ?) DESC, id DESC LIMIT 1`,
      [orderQueryVal, orderQueryVal, `HD${orderQueryVal}`, `%${orderQueryVal}%`, orderQueryVal, `HD${orderQueryVal}`]
    );

    if (orders.length > 0) {
      const order = orders[0];
      const [items] = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );

      let statusDesc = 'Đang xử lý';
      let statusIcon = '📦';
      switch (order.status) {
        case 'Pending':
          statusDesc = 'Chờ xác nhận & chuẩn bị hàng';
          statusIcon = '⏳';
          break;
        case 'Processing':
          statusDesc = 'Đang đóng gói & vận chuyển giao hàng';
          statusIcon = '⚡';
          break;
        case 'Completed':
          statusDesc = 'Giao hàng thành công hoàn tất';
          statusIcon = '✅';
          break;
        case 'Cancelled':
          statusDesc = 'Đã hủy đơn hàng';
          statusIcon = '❌';
          break;
      }

      let payDesc = order.payment_method === 'bank' ? 'Chuyển khoản VietQR' : 'Thanh toán COD khi nhận hàng';
      if (order.payment_method === 'bank') {
        if (order.payment_status === 'paid_pending_verification') {
          payDesc += ' (Đang chờ hệ thống duyệt)';
        } else if (order.payment_status === 'paid') {
          payDesc += ' (Đã thanh toán thành công)';
        } else {
          payDesc += ' (Chờ thanh toán)';
        }
      }

      const formattedTotal = Number(order.total_price || 0).toLocaleString('vi-VN');
      const itemsListStr = items.map(it => `  • ${it.quantity}x ${it.product_name} (${it.size || 'Freesize'}, ${it.color || 'Tiêu chuẩn'})`).join('\n');

      const reply = `${statusIcon} **THÔNG TIN ĐƠN HÀNG #${order.order_code || order.id}**\n\n` +
        `• **Trạng thái:** ${statusDesc}\n` +
        `• **Người nhận:** ${order.customer_name || 'Khách hàng'} (${order.customer_phone || ''})\n` +
        `• **Địa chỉ:** ${order.customer_address || 'Theo địa chỉ đã đặt'}\n` +
        `• **Hình thức:** ${payDesc}\n` +
        `• **Tổng thanh toán:** **${formattedTotal}đ**\n\n` +
        `🛍️ **Sản phẩm trong đơn:**\n${itemsListStr || '  • Thông tin chi tiết sản phẩm'}\n\n` +
        '🚚 Quý khách có thể theo dõi chi tiết và yêu cầu đổi trả tại mục **Đơn hàng của tôi**!';

      return {
        reply,
        intent: 'order_tracking',
        data: {
          order: {
            id: order.id,
            order_code: order.order_code || `HD${order.id}`,
            status: order.status,
            status_desc: statusDesc,
            total_price: order.total_price,
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            customer_name: order.customer_name,
            customer_address: order.customer_address,
            items: items.map(i => ({
              id: i.id,
              product_name: i.product_name,
              quantity: i.quantity,
              size: i.size,
              color: i.color,
              price: i.price
            }))
          }
        },
        suggested_actions: ['Đơn hàng của tôi', 'Chính sách đổi trả', 'Săn mã giảm giá', 'Gợi ý áo Polo']
      };
    } else {
      return {
        reply: `🔍 Rất tiếc em chưa tìm thấy đơn hàng với mã **#${orderQueryVal}** trong hệ thống.\n\nQuý khách vui lòng kiểm tra lại mã đơn (Ví dụ: HD804558 hoặc số đơn) hoặc vào mục **Đơn hàng của tôi** để xem danh sách đơn đã đặt nhé! 🙏`,
        intent: 'order_tracking',
        suggested_actions: ['Đơn hàng của tôi', 'Tư vấn chọn size', 'Săn mã giảm giá']
      };
    }
  }

  // Tra cứu đơn nói chung
  if (norm.includes('don hang') || norm.includes('tra cuu') || norm.includes('kiem tra don') || norm.includes('tinh trang don') || norm.includes('don cua toi') || norm.includes('don gan nhat') || norm.includes('xem don')) {
    let targetOrders = [];
    let isUserSpecific = false;

    if (userId) {
      const [userOrders] = await pool.query(
        'SELECT id, order_code, status, total_price, customer_name, customer_address, created_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 4',
        [userId]
      );
      if (userOrders.length > 0) {
        targetOrders = userOrders;
        isUserSpecific = true;
      }
    }

    // Nếu chưa đăng nhập hoặc user này chưa có đơn nào, lấy các đơn mới nhất của hệ thống
    if (targetOrders.length === 0) {
      const [recentAll] = await pool.query(
        'SELECT id, order_code, status, total_price, customer_name, customer_address, created_at FROM orders ORDER BY id DESC LIMIT 4'
      );
      targetOrders = recentAll;
      isUserSpecific = false;
    }

    // Lấy kèm thông tin sản phẩm tóm tắt cho từng đơn
    for (let ord of targetOrders) {
      const [items] = await pool.query(
        'SELECT product_name, quantity, size, color FROM order_items WHERE order_id = ? LIMIT 2',
        [ord.id]
      );
      ord.items_summary = items.map(it => `${it.quantity}x ${it.product_name}`).join(', ');
      
      let sDesc = 'Đang xử lý';
      switch (ord.status) {
        case 'Pending': sDesc = 'Chờ xác nhận'; break;
        case 'Processing': sDesc = 'Đang giao hàng'; break;
        case 'Completed': sDesc = 'Giao thành công'; break;
        case 'Cancelled': sDesc = 'Đã hủy'; break;
      }
      ord.status_desc = sDesc;
    }

    let introText = isUserSpecific 
      ? '📦 **DANH SÁCH ĐƠN HÀNG GẦN ĐÂY CỦA BẠN:**\n\nEm đã tìm thấy các đơn hàng bạn đã đặt. Bạn có thể bấm nút **Tra cứu hành trình** hoặc xem chi tiết từng đơn ngay bên dưới nhé:'
      : '📦 **DANH SÁCH ĐƠN HÀNG GẦN NHẤT TRÊN HỆ THỐNG:**\n\n' + (userId ? 'Bạn chưa có đơn mới. ' : 'Dưới đây là các đơn hàng vừa đặt trên hệ thống. ') + 'Bạn có thể chạm vào từng đơn để tra cứu ngay tiến độ giao hàng nhé:';

    const suggestedActions = targetOrders.map(o => `Tra cứu #${o.order_code || o.id}`).concat(['Đơn hàng của tôi']);

    return {
      reply: introText,
      intent: 'recent_orders',
      data: {
        recent_orders: targetOrders.map(o => ({
          id: o.id,
          order_code: o.order_code || `HD${o.id}`,
          status: o.status,
          status_desc: o.status_desc,
          total_price: o.total_price,
          created_at: o.created_at,
          items_summary: o.items_summary,
          customer_name: o.customer_name
        }))
      },
      suggested_actions: suggestedActions
    };
  }

  return null;
}

// 3. Tìm kiếm & Gợi ý sản phẩm
async function handleProductDiscovery(pool, message) {
  const norm = normalizeText(message);

  const productKeywords = [
    'ao', 'quan', 'giay', 'vay', 'dam', 'phu kien', 'bo', 'set',
    'polo', 'so mi', 'thun', 'jean', 'kaki', 'short', 'khoac', 'hoodie',
    'san pham', 'goi y', 'ban chay', 'hot', 'moi', 'giam gia', 'sale',
    'mua do', 'mua sam', 'thoi trang'
  ];

  const matchedKeyword = productKeywords.some(kw => norm.includes(kw));
  if (!matchedKeyword) return null;

  let querySql = 'SELECT id, name, price, original_price, discount, category, image, sold_count, stock FROM products WHERE 1=1';
  const params = [];

  if (norm.includes('polo')) {
    querySql += ' AND name LIKE ?';
    params.push('%Polo%');
  } else if (norm.includes('so mi')) {
    querySql += ' AND name LIKE ?';
    params.push('%Sơ mi%');
  } else if (norm.includes('jean')) {
    querySql += ' AND name LIKE ?';
    params.push('%Jean%');
  } else if (norm.includes('short')) {
    querySql += ' AND name LIKE ?';
    params.push('%Short%');
  } else if (norm.includes('ao')) {
    querySql += ' AND (category = \'Áo\' OR name LIKE ?)';
    params.push('%Áo%');
  } else if (norm.includes('quan')) {
    querySql += ' AND (category = \'Quần\' OR name LIKE ?)';
    params.push('%Quần%');
  } else if (norm.includes('giay') || norm.includes('sneaker')) {
    querySql += ' AND (category = \'Giày\' OR name LIKE ?)';
    params.push('%Giày%');
  } else if (norm.includes('vay') || norm.includes('dam')) {
    querySql += ' AND (category = \'Váy\' OR name LIKE ?)';
    params.push('%Váy%');
  } else if (norm.includes('phu kien')) {
    querySql += ' AND (category = \'Phụ kiện\' OR name LIKE ?)';
    params.push('%Phụ kiện%');
  } else if (norm.includes('bo') || norm.includes('set')) {
    querySql += ' AND (category = \'Bộ\' OR name LIKE ?)';
    params.push('%Bộ%');
  }

  if (norm.includes('duoi 300') || norm.includes('< 300') || norm.includes('300k')) {
    querySql += ' AND price <= 300000';
  } else if (norm.includes('duoi 500') || norm.includes('< 500') || norm.includes('500k')) {
    querySql += ' AND price <= 500000';
  }

  if (norm.includes('moi') || norm.includes('new')) {
    querySql += ' ORDER BY id DESC LIMIT 5';
  } else {
    querySql += ' ORDER BY sold_count DESC, id DESC LIMIT 5';
  }

  const [products] = await pool.query(querySql, params);

  if (products.length === 0) {
    const [top] = await pool.query('SELECT id, name, price, original_price, discount, category, image, sold_count, stock FROM products ORDER BY sold_count DESC LIMIT 5');
    return {
      reply: '🛍️ **TOP SẢN PHẨM BÁN CHẠY NHẤT TẠI THOITRANGHD:**\n\nDưới đây là những mẫu trang phục được yêu thích nhất tháng này dành cho bạn! Chạm vào từng sản phẩm để xem chi tiết nhé:',
      intent: 'product_discovery',
      data: { products: top },
      suggested_actions: ['Xem áo Polo', 'Xem quần Jean', 'Tư vấn chọn size', 'Săn mã giảm giá']
    };
  }

  return {
    reply: `🛍️ **GỢI Ý SẢN PHẨM THỜI TRANG ĐỈNH CAO CHO BẠN:**\n\nEm đã chọn lọc ${products.length} mẫu hot trend phù hợp nhất với yêu cầu của bạn. Quý khách có thể chạm vào để xem ảnh và đặt hàng ngay nhé! ✨`,
    intent: 'product_discovery',
    data: { products },
    suggested_actions: ['Tư vấn chọn size', 'Xem thêm mẫu Áo', 'Xem mẫu Quần', 'Săn voucher giảm giá']
  };
}

// 4. Tra cứu mã giảm giá
async function handleVouchers(pool, message) {
  const norm = normalizeText(message);
  const voucherKeywords = ['voucher', 'ma giam', 'khuyen mai', 'uu dai', 'coupon', 'sale', 'giam gia', 'tiet kiem'];
  const isVoucher = voucherKeywords.some(kw => norm.includes(kw));

  if (!isVoucher) return null;

  const [vouchers] = await pool.query(
    'SELECT code, discount_type, value, min_spend, usage_limit, times_used, expires_at FROM vouchers WHERE (expires_at IS NULL OR expires_at > NOW()) AND times_used < usage_limit ORDER BY value DESC LIMIT 6'
  );

  let voucherListText = vouchers.map(v => {
    const valText = v.discount_type === 'percent' ? `Giảm ${v.value}%` : `Giảm ${Number(v.value).toLocaleString('vi-VN')}đ`;
    const minText = Number(v.min_spend || 0).toLocaleString('vi-VN');
    return `🎟️ **${v.code}**: ${valText} (Đơn từ ${minText}đ)`;
  }).join('\n');

  const reply = '🎉 **CÁC MÃ GIẢM GIÁ SIÊU HOT HÔM NAY:**\n\n' +
    voucherListText +
    '\n\n👉 **Cách dùng:** Nhập mã tại bước **Thanh toán đơn hàng** để được giảm trừ trực tiếp vào tổng tiền nhé! ✨';

  return {
    reply,
    intent: 'vouchers',
    data: { vouchers },
    suggested_actions: ['Xem sản phẩm Hot', 'Tư vấn chọn size', 'Chính sách vận chuyển', 'Tra cứu đơn hàng']
  };
}

// 5. Chính sách cửa hàng
function handleShopPolicies(message) {
  const norm = normalizeText(message);

  if (norm.includes('doi tra') || norm.includes('doi hang') || norm.includes('tra hang') || norm.includes('khong vua') || norm.includes('doi size') || norm.includes('bao hanh') || norm.includes('hoan tien')) {
    return {
      reply: '🔄 **CHÍNH SÁCH ĐỔI TRẢ 7 NGÀY - THOITRANGHD:**\n\n' +
        '1. **Đổi size miễn phí:** Hỗ trợ đổi size/màu trong vòng **7 ngày** kể từ khi nhận hàng nếu mặc không vừa vặn.\n' +
        '2. **Lỗi nhà sản xuất:** Hoàn tiền 100% hoặc đổi mới ngay lập tức nếu sản phẩm có lỗi may mặc, ố màu.\n' +
        '3. **Thao tác đơn giản:** Quý khách vào tab **Đơn hàng** > Chọn đơn đã giao > Nhấn **Yêu cầu Đổi/Trả hàng** là xong!\n\n' +
        'ThoiTrangHD luôn đặt sự hài lòng của quý khách lên hàng đầu! 💖',
      intent: 'shop_policy',
      suggested_actions: ['Đơn hàng của tôi', 'Tư vấn chọn size', 'Xem áo Polo', 'Hotline hỗ trợ']
    };
  }

  if (norm.includes('ship') || norm.includes('van chuyen') || norm.includes('phi ship') || norm.includes('giao hang') || norm.includes('bao lau') || norm.includes('mat bao lau')) {
    return {
      reply: '🚚 **CHÍNH SÁCH VẬN CHUYỂN TOÀN QUỐC:**\n\n' +
        '• **FREESHIP TOÀN QUỐC** cho mọi đơn hàng từ **500.000đ** (hoặc dùng mã \"FREESHIP\").\n' +
        '• **Phí ship tiêu chuẩn:** Đồng giá **30.000đ** trên toàn quốc.\n' +
        '• **Thời gian nhận hàng:**\n' +
        '  - Nội thành Hà Nội & TP.HCM: 1 - 2 ngày làm việc.\n' +
        '  - Các tỉnh thành khác: 2 - 4 ngày làm việc.\n' +
        '• Được kiểm tra hàng trước khi thanh toán cho shipper! 📦',
      intent: 'shop_policy',
      suggested_actions: ['Săn mã Freeship', 'Xem sản phẩm Hot', 'Tra cứu đơn hàng']
    };
  }

  if (norm.includes('thanh toan') || norm.includes('vietqr') || norm.includes('chuyen khoan') || norm.includes('ngan hang') || norm.includes('mb bank') || norm.includes('cod') || norm.includes('tien mat')) {
    return {
      reply: '💳 **PHƯƠNG THỨC THANH TOÁN TIỆN LỢI:**\n\n' +
        '1. **Thanh toán khi nhận hàng (COD):** Nhận hàng kiểm tra ưng ý rồi mới thanh toán tiền mặt cho shipper.\n' +
        '2. **Chuyển khoản VietQR Siêu Tốc:** Quét mã QR qua app ngân hàng bất kỳ (MB Bank, Vietcombank, Techcombank, MoMo...). Hệ thống tự động xác nhận chỉ sau vài giây! ⚡\n\n' +
        'An toàn 100% - Bảo mật tối đa!',
      intent: 'shop_policy',
      suggested_actions: ['Xem sản phẩm Hot', 'Săn mã giảm giá', 'Tra cứu đơn hàng']
    };
  }

  if (norm.includes('dia chi') || norm.includes('o dau') || norm.includes('cua hang') || norm.includes('showroom') || norm.includes('hotline') || norm.includes('lien he') || norm.includes('tong dai')) {
    return {
      reply: '📍 **HỆ THỐNG CỬA HÀNG & THÔNG TIN LIÊN HỆ:**\n\n' +
        '• **Showroom Hà Nội:** Số 123 Cầu Giấy, Q. Cầu Giấy, Hà Nội\n' +
        '• **Showroom TP.HCM:** Số 456 Nguyễn Trãi, Phường 8, Quận 5, TP.HCM\n' +
        '• ☎️ **Hotline CSKH:** **1900 6868** (Hỗ trợ từ 8:00 - 22:00 tất cả các ngày trong tuần)\n' +
        '• ✉️ **Email:** support@thoitranghd.vn\n\n' +
        'Rất hân hạnh được phục vụ quý khách! ✨',
      intent: 'shop_policy',
      suggested_actions: ['Xem sản phẩm mới', 'Tư vấn chọn size', 'Săn mã giảm giá']
    };
  }

  return null;
}

// 5.1 Tư vấn chất liệu vải
function handleFabricInquiry(message) {
  const norm = normalizeText(message);
  const isFabric = norm.includes('chat lieu') || norm.includes('chat vai') || norm.includes('vai gi') ||
    norm.includes('cotton') || norm.includes('co gian') || norm.includes('tham hut') ||
    norm.includes('xu long') || norm.includes('bai mau') || norm.includes('giat may');

  if (!isFabric) return null;

  return {
    reply: '🧵 **TIÊU CHUẨN CHẤT LIỆU VẢI CAO CẤP TẠI THOITRANGHD:**\n\n' +
      '• **Áo Thun & Polo:** Sử dụng sợi **100% Cotton Compact 2 chiều / 4 chiều** và vải **Pique dệt mắt chim** thoáng khí, thấm hút mồ hôi vượt trội, co giãn linh hoạt và **không xù lông, không bai nhão** sau khi giặt máy.\n' +
      '• **Quần Jean & Kaki:** Chất liệu Denim wash mềm 12-14oz cao cấp kết hợp sợi Spandex chống co rút, đanh form và tạo cảm giác êm ái, thoải mái suốt cả ngày dài.\n' +
      '• **Sơ mi:** Vải Cotton lụa & Modal chống nhăn, giữ nếp phẳng phiu không cần là ủi nhiều.\n\n' +
      '✨ Tất cả sản phẩm đều được kiểm định an toàn và hỗ trợ đổi trả miễn phí trong 7 ngày!',
    intent: 'fabric_inquiry',
    suggested_actions: ['Tư vấn chọn size', 'Xem áo Polo cotton', 'Xem quần Jean', 'Chính sách đổi trả']
  };
}

// 5.2 Gợi ý phối đồ theo dịp & phong cách (Styling Assistant)
async function handleStylingAndOccasions(pool, message) {
  const norm = normalizeText(message);

  const isWedding = norm.includes('tiec') || norm.includes('dam cuoi') || norm.includes('su kien') || norm.includes('da hoi') || norm.includes('sinh nhat');
  const isOffice = norm.includes('cong so') || norm.includes('di lam') || norm.includes('van phong') || norm.includes('phong van');
  const isCasual = norm.includes('di choi') || norm.includes('dao pho') || norm.includes('hen ho') || norm.includes('cafe') || norm.includes('du lich');
  const isSport = norm.includes('the thao') || norm.includes('gym') || norm.includes('chay bo') || norm.includes('tap luyen');

  if (!isWedding && !isOffice && !isCasual && !isSport && !norm.includes('phoi do') && !norm.includes('outfit')) {
    return null;
  }

  let styleDesc = '';
  let queryKeyword = '%Áo%';

  if (isWedding) {
    styleDesc = '🎩 **GỢI Ý OUTFIT ĐI TIỆC & SỰ KIỆN SANG TRỌNG:**\n\n' +
      '• **Công thức:** Áo Sơ mi Slimfit (Trắng/Xanh pastel) + Quần Tây/Kaki ống đứng + Giày Loafer/Sneaker trắng.\n' +
      '• **Điểm nhấn:** Phong thái lịch lãm, chỉn chu và tôn dáng tuyệt đối.';
    queryKeyword = '%Sơ mi%';
  } else if (isOffice) {
    styleDesc = '💼 **GỢI Ý OUTFIT CÔNG SỞ & ĐI LÀM THANH LỊCH:**\n\n' +
      '• **Công thức:** Áo Polo cổ dệt cao cấp hoặc Sơ mi kẻ tinh tế + Quần Jean/Kaki tối màu.\n' +
      '• **Điểm nhấn:** Vừa chuyên nghiệp, đứng đắn lại vừa thoải mái cho cả ngày làm việc 8 tiếng.';
    queryKeyword = '%Polo%';
  } else if (isSport) {
    styleDesc = '🏃 **GỢI Ý OUTFIT THỂ THAO & VẬN ĐỘNG NĂNG ĐỘNG:**\n\n' +
      '• **Công thức:** Áo Thun co giãn thể thao + Quần Short hoặc Jogger năng động.\n' +
      '• **Điểm nhấn:** Thoáng mát, thấm hút mồ hôi tối đa và tự do vận động mọi tư thế.';
    queryKeyword = '%Short%';
  } else {
    // Đi chơi / Dạo phố / Cafe
    styleDesc = '✨ **GỢI Ý OUTFIT ĐI CHƠI, HẸN HÒ & DẠO PHỐ:**\n\n' +
      '• **Công thức:** Áo Thun Oversize / Polo phối màu + Quần Jean Streetwear hoặc Short cá tính.\n' +
      '• **Điểm nhấn:** Phong cách trẻ trung, thời thượng bắt trọn ánh nhìn và cực kỳ ăn ảnh khi check-in!';
    queryKeyword = '%Streetwear%';
  }

  const [products] = await pool.query(
    'SELECT id, name, price, original_price, discount, category, image, sold_count, stock FROM products WHERE name LIKE ? OR category LIKE ? ORDER BY sold_count DESC LIMIT 4',
    [queryKeyword, queryKeyword]
  );

  return {
    reply: `${styleDesc}\n\n🛍️ **Một số mẫu trang phục hoàn hảo cho set đồ này:**`,
    intent: 'styling_advice',
    data: { products: products.length > 0 ? products : [] },
    suggested_actions: ['Tư vấn chọn size', 'Xem thêm mẫu Áo', 'Xem mẫu Quần', 'Săn mã giảm giá']
  };
}

// 6. Xử lý chính của Chatbot
async function handleChatbotMessage(pool, message, userId = null) {
  const norm = normalizeText(message);

  // 1. Chào hỏi
  const isGreeting = (
    /\b(hi|hello|alo|chao|xin chao)\b/i.test(norm) ||
    norm.includes('ban la ai') ||
    norm.includes('tro ly')
  ) && !norm.includes('don hang') && !norm.includes('size') && !norm.includes('ship');

  if (isGreeting) {
    return {
      reply: 'Xin chào quý khách! 👋 Em là **Trợ lý AI ThoiTrangHD** 🤖✨\n\nEm có thể hỗ trợ quý khách ngay lập tức:\n' +
        '• 📏 **Tư vấn chọn size chuẩn** (chỉ cần nhập chiều cao, cân nặng)\n' +
        '• 📦 **Tra cứu đơn hàng tức thì** (theo mã đơn hoặc tài khoản)\n' +
        '• 🛍️ **Gợi ý sản phẩm hot trend** (áo polo, sơ mi, quần jean...)\n' +
        '• 🎟️ **Săn mã giảm giá & freeship** hot nhất hôm nay\n' +
        '• 🔄 **Chính sách đổi trả 7 ngày & giao hàng**\n\n' +
        'Quý khách cần em hỗ trợ điều gì hôm nay ạ? 😊',
      intent: 'greeting',
      suggested_actions: ['Tư vấn chọn size', 'Gợi ý áo Polo hot', 'Tra cứu đơn hàng', 'Mã giảm giá hôm nay']
    };
  }

  // 2. Tra cứu đơn hàng (ưu tiên trước size để tránh nhầm mã đơn)
  const orderResult = await handleOrderTracking(pool, message, userId);
  if (orderResult) {
    return orderResult;
  }

  // 3. Tư vấn size
  const sizeResult = analyzeSize(message);
  if (sizeResult) {
    return {
      reply: sizeResult.reply,
      intent: 'size_advice',
      data: sizeResult.data || {},
      suggested_actions: sizeResult.suggested_actions
    };
  }

  // 4. Mã giảm giá
  const voucherResult = await handleVouchers(pool, message);
  if (voucherResult) {
    return voucherResult;
  }

  // 5. Chính sách cửa hàng
  const policyResult = handleShopPolicies(message);
  if (policyResult) {
    return policyResult;
  }

  // 5.1 Chất liệu vải
  const fabricResult = handleFabricInquiry(message);
  if (fabricResult) {
    return fabricResult;
  }

  // 5.2 Gợi ý phối đồ theo sự kiện & phong cách (Styling Advice)
  const stylingResult = await handleStylingAndOccasions(pool, message);
  if (stylingResult) {
    return stylingResult;
  }

  // 6. Tìm kiếm & Gợi ý sản phẩm
  const productResult = await handleProductDiscovery(pool, message);
  if (productResult) {
    return productResult;
  }

  // Fallback thân thiện
  return {
    reply: 'Dạ, em là **Trợ lý Thời Trang ThoiTrangHD** 🤖✨\n\nQuý khách có thể hỏi em bất kỳ điều gì như:\n' +
      '• \"*Tư vấn size cao 1m70 nặng 65kg*\"\n' +
      '• \"*Tra cứu đơn hàng #55*\" hoặc \"*đơn hàng của tôi*\"\n' +
      '• \"*Gợi ý áo polo dưới 300k*\" hoặc \"*quần jean hot*\"\n' +
      '• \"*Có mã giảm giá nào không*\"\n' +
      '• \"*Chính sách đổi trả như thế nào*\"\n\n' +
      'Em luôn sẵn sàng hỗ trợ quý khách ngay lập tức! ❤️',
    intent: 'general',
    suggested_actions: ['Tư vấn chọn size', 'Tra cứu đơn hàng', 'Xem áo Polo', 'Săn mã giảm giá']
  };
}

module.exports = {
  handleChatbotMessage,
  analyzeSize,
  normalizeText
};
