const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db',
};

const initialProducts = [
  { 
    id: '1', 
    name: 'Áo Thun Cotton Basic HOTEL', 
    price: 350000, 
    category: 'Áo', 
    image: 'sp1.jpg', 
    description: 'Áo thun cotton 100% form suông unisex, chất liệu mềm mịn thoáng mát thấm hút mồ hôi. Điểm nhấn thêu chữ HOTEL sắc nét trước ngực, dễ phối đồ hàng ngày.', 
    features: JSON.stringify(['Cotton 100%', 'Thêu chữ HOTEL', 'Form Unisex', 'Thoáng mát']), 
    discount: 15 
  },
  { 
    id: '2', 
    name: 'Áo Thun Nam Graphic Outcast', 
    price: 420000, 
    category: 'Áo', 
    image: 'sp2.jpg', 
    description: 'Áo thun nam phong cách streetwear in hình graphic Outcast độc đáo. Chất liệu cotton cao cấp co giãn 4 chiều, kiểu dáng năng động trẻ trung.', 
    features: JSON.stringify(['Graphic Outcast', 'Cotton cao cấp', 'Streetwear', 'Co giãn thoải mái']), 
    discount: 0 
  },
  { 
    id: '3', 
    name: 'Áo Sweater Nỉ Trơn Mint Pastel', 
    price: 450000, 
    category: 'Áo', 
    image: 'sp3.jpg', 
    description: 'Áo sweater nỉ da cá trơn tone màu xanh mint pastel dịu mắt thời thượng. Bo cổ và tay áo tỉ mỉ, giữ ấm cơ thể tốt và chống gió.', 
    features: JSON.stringify(['Nỉ da cá cao cấp', 'Màu Mint Pastel', 'Dày dặn giữ ấm', 'Không xù lông']), 
    discount: 0 
  },
  { 
    id: '4', 
    name: 'Đầm Xòe Nữ Họa Tiết Hoa Đỏ Vintage', 
    price: 950000, 
    category: 'Váy', 
    image: 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?q=80&w=800&auto=format&fit=crop', 
    description: 'Đầm xòe họa tiết hoa đỏ rực rỡ phong cách vintage nữ tính. Cổ chữ V kèm thắt lưng tôn vòng eo thon gọn, chất vải voan mềm rũ bay bổng.', 
    features: JSON.stringify(['Họa tiết hoa vintage', 'Kèm thắt lưng tôn dáng', 'Vải voan cao cấp', 'Cổ chữ V thanh lịch']), 
    discount: 0 
  },
  { 
    id: '5', 
    name: 'Áo Thun Nam Trắng Basic Cổ Tròn', 
    price: 290000, 
    category: 'Áo', 
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop', 
    description: 'Áo thun basic màu trắng trơn cổ tròn chất vải cotton 100% co giãn 4 chiều. Thiết kế đơn giản, lịch sự, item cơ bản không thể thiếu.', 
    features: JSON.stringify(['Cotton 100%', 'Trắng basic', 'Co giãn 4 chiều', 'Thấm hút mồ hôi']), 
    discount: 20 
  },
  { 
    id: '6', 
    name: 'Quần Jeans Nữ Rách Gối Họa Tiết', 
    price: 680000, 
    category: 'Quần', 
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop', 
    description: 'Quần jeans nữ rách gối cá tính đính các huy hiệu họa tiết trẻ trung. Chất vải denim dày dặn chuẩn form, tôn dáng chân dài năng động.', 
    features: JSON.stringify(['Denim cao cấp', 'Rách gối cá tính', 'Huy hiệu trẻ trung', 'Tôn dáng']), 
    discount: 0 
  },
  { 
    id: '7', 
    name: 'Áo Blazer Nam Màu Be Minimalist', 
    price: 1200000, 
    category: 'Áo', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC40P7qrg8bXyHKiZCHiZPUtXuULczZLT25M1RT5h3WkPM8bHLokL9aUrRNiWDlMmdCSZDauAbGdxX5fejQ6aW6IpRzLTfXMlOWkdMQ6ATf2J2RHbFt8K12aT4ZdcGZGtlN3HFRvK8_SE30k30CA43B780SKEDmFY-krwPtI35HB5DJwKUgaz907-zO3hakkJAqdNftLQc5pee1xc3DOFaaGD1eDL8ROGdXq9SRuVGCEOyTBje2jsshxg', 
    description: 'Áo blazer thiết kế tối giản phong cách Hàn Quốc tone màu be thanh lịch. Phom áo đứng cá tính, lớp lót cao cấp thoáng mát.', 
    features: JSON.stringify(['Màu be thanh lịch', 'Vải tuyết mưa cao cấp', 'Hai khuy cổ điển', 'Form đứng tôn dáng']), 
    discount: 0 
  },
  { 
    id: '8', 
    name: 'Quần Tây Nữ Ống Đứng Tailored Đen', 
    price: 850000, 
    category: 'Quần', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlc4VpFdAxC13fvAWO1qFhqHsdxLATSS9CrIVyAMRnqW6ngD3PRCAglV5t38SJOuexG36PlF2KkEXeCRdoW23gfQ6Mj1nbxLW--D0utl9Iqr8-d5bvioUXZ6rL3y8Pb0sN-PvmEb5nIlPctN_WrUYAmxI7bYKqERJXGx77W76SS60sb3Y2jdlVZ1SOXMkttQdT_us131xXG5JeCtAVnQVaxTEorXZAQfYK_4lqCokkspvEXvRK5Ffkvw', 
    description: 'Quần tây nữ cạp cao ống đứng thanh lịch, cắt may chuẩn phom công sở. Chất vải không nhăn, tôn chiều dài đôi chân.', 
    features: JSON.stringify(['Cạp cao hack dáng', 'Vải tuyết mưa không nhăn', 'Đen sang trọng', 'Đường ly sắc nét']), 
    discount: 0 
  },
  { 
    id: '9', 
    name: 'Áo Sơ Mi Lụa Trắng Dài Tay Cao Cấp', 
    price: 950000, 
    category: 'Áo', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANZ4Fr2B_W0LO24FYqQVCaoCQMCWG-5n3pnV_V7TdqWqR5058wHXLQKaQg48BT-RwQF1IV_rdIix3-xtJ9kLYoIbONAiZSEKpd1_2nbC6Kyi75zMbxqvfFhXGSXecAniFNb7KZRBZd55MrIFxYRAp4onhfDnYg0n8ZBy73GLpw0zVWAYaagOqh9FUK3WJcLaMUZmf4JQ2nC6er4nQs1uBu6vVbFmX1rqosqHjUq71uo5z8kyNCAB2xfw', 
    description: 'Áo sơ mi lụa mềm mại dập ly nhẹ, cổ bẻ sang trọng. Mang lại cảm giác mượt mà êm ái cho cả ngày làm việc và dạo phố.', 
    features: JSON.stringify(['Lụa tự nhiên', 'Thoáng mát mềm mịn', 'Khuy ngọc trai', 'Chống nhăn']), 
    discount: 0 
  },
  { 
    id: '10', 
    name: 'Túi Xách Nữ Da Thật Khóa Kim Loại', 
    price: 1800000, 
    category: 'Phụ kiện', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_9j_VS-EZHGd6QuWSAzNbzQlUVAca17DmPVuEUbU5efJ0H-zedNWfEzCYzgHbg23qx9V9jiZSDlLfy2GI3FJu6vDYw3kmDfzXa4wVy9RKiE5_me8wf-ZWJWzXY2dvjpfW3TeTkOD0pNMUxPc86aqpLnxcKjaXiXNP9kbWyWGB5NxgdP1uhiA9WYgzAmBhL5K3eN1Bd9h_CxCkDgqJfr2_Y2xt_yQ8nZ0J95O7wP_whOukswGbTPQroQ', 
    description: 'Túi đeo chéo nữ chất liệu da cao cấp mềm mại kết hợp khóa bấm kim loại mạ vàng sang trọng. Ngăn chứa tiện dụng cho điện thoại và đồ dùng cá nhân.', 
    features: JSON.stringify(['Da cao cấp', 'Khóa bấm kim loại vàng', 'Quai đeo điều chỉnh', 'Chống trầy xước']), 
    discount: 0 
  },
  { 
    id: '11', 
    name: 'Kính Mát Thời Trang Gọng Kim Loại Vàng', 
    price: 650000, 
    category: 'Phụ kiện', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXQfm5gL6QN4IgWLJYXdD3_Y95nvr0oP_AfYtcLO_ZeCZWA5Y5MteOPJczK0iF7wGAX5DN98o4k4I2HCm-C_DZHdWU0ec2C-JmKxZNJMqoGDHacw9ndOzCyJYiD_WKai6gC-rPVhD0NUjHI7n1w4Y_AtfWgjtJchbWsKoEXXSIwxa51GytQSZYbE3MxTklnZ_IKcAsLS3E1xqO5BbAIVHiYJeTAOqnBc7m2gEtX32PJYQ_wi7UmpRX5Q', 
    description: 'Kính râm gọng kim loại mạ vàng sang trọng kết hợp tròng kính chống tia UV400 bảo vệ mắt tối đa dưới ánh nắng.', 
    features: JSON.stringify(['Chống UV400', 'Gọng kim loại nhẹ mạ vàng', 'Đệm mũi êm ái', 'Phong cách Unisex']), 
    discount: 0 
  },
  { 
    id: '12', 
    name: 'Áo Khoác Trench Coat Dáng Dài Khuy Kép', 
    price: 2500000, 
    category: 'Áo', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfIOWDKEY9mFkvh98yQGWfmR-kvcaskXNEHByDkstcA_ZwbWIWo8Fj8bIBjOw2rWhWoksjfDHpxZmylIJXb6LgV1nPGSYiGTEHyz62nfsyUMmSZE8tZiK9mcUCvH5k9EiBzsJF0t2EeJ34sxirIinp3j743MU4Qhc-QzcKx1CdWnp0cHj_sJiYNmZU9_76JFz84xbdGhZdPuT5uNGtRIct-_Dwwb0RW5bbDyO24pTDf1JAArCvhckijA', 
    description: 'Áo khoác măng tô dáng dài phong cách cổ điển thanh lịch, kèm thắt lưng tôn eo và hàng cúc đôi cao cấp. Giữ ấm và cản gió tuyệt vời.', 
    features: JSON.stringify(['Khuy kép cổ điển', 'Kèm thắt lưng', 'Chống gió cản lạnh', 'Dáng dài sang trọng']), 
    discount: 0 
  },
  { 
    id: '13', 
    name: 'Giày Sneaker Da Trắng Tối Giản', 
    price: 1100000, 
    category: 'Giày', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqIryciCs4kLlDdIKca7sxJISNVeNTXEFW53liZQuPMgQeukQPdZJo6hbnsYnOMRWTANc521QFQP9B96bXoiPCmuF2CHEA5aKxjUJ2v64pedABYIwMqboT5IkFwwcZ1jErvc_41eQlcwfWSof6iyRwHmuipyJoLWB_G-3J7j8T4r2ZyvSKOdMAVul98LMyV5bxTUU-nNXmEWPV3jkvKGCLa13KZq-p9CAvTZpRneDZVYL0kGN65PSnQg', 
    description: 'Giày sneaker da trắng tối giản, thiết kế thanh lịch dễ phối đồ. Đế cao su êm ái chống trơn trượt hiệu quả.', 
    features: JSON.stringify(['Da tự nhiên 100%', 'Đế cao su đàn hồi', 'Êm chân thoáng khí', 'Màu trắng basic']), 
    discount: 0 
  },
  { 
    id: '14', 
    name: 'Áo Hoodie Nữ Nỉ Bông Có Mũ', 
    price: 520000, 
    category: 'Áo', 
    image: 'sp4.jpg', 
    description: 'Áo hoodie nữ nỉ bông màu trắng ấm áp, có mũ trùm đầu dây rút phong cách Hàn Quốc trẻ trung năng động.', 
    features: JSON.stringify(['Nỉ bông dày dặn', 'Mũ trùm dây rút', 'Túi kangaroo trước', 'Giữ nhiệt tốt']), 
    discount: 10 
  },
  { 
    id: '15', 
    name: 'Quần Short Kaki Nữ Cạp Cao Kèm Thắt Lưng', 
    price: 380000, 
    category: 'Quần', 
    image: 'sp5.jpg', 
    description: 'Quần short nữ chất kaki cao cấp xếp ly trước kèm thắt lưng da thanh lịch. Thiết kế cạp cao tôn dáng thon dài.', 
    features: JSON.stringify(['Kaki cao cấp', 'Kèm thắt lưng da', 'Cạp cao tôn dáng', 'Xếp ly thanh lịch']), 
    discount: 0 
  },
  { 
    id: '16', 
    name: 'Quần Suông Ống Rộng Đen Unisex', 
    price: 490000, 
    category: 'Quần', 
    image: 'sp6.jpg', 
    description: 'Quần suông ống rộng màu đen unisex thời thượng. Form dáng rũ tự nhiên che khuyết điểm, dễ mix & match cùng áo thun, sơ mi.', 
    features: JSON.stringify(['Vải tuyết nhung rũ đẹp', 'Ống suông rộng', 'Unisex', 'Lưng thun thoải mái']), 
    discount: 0 
  },
  { 
    id: '17', 
    name: 'Set Bộ Vest Công Sở Nữ Tone Be', 
    price: 1350000, 
    category: 'Bộ', 
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop', 
    description: 'Set bộ vest nữ thanh lịch gồm áo blazer và quần ống đứng đồng điệu tone màu be thời thượng. Phù hợp cho môi trường công sở và gặp gỡ đối tác.', 
    features: JSON.stringify(['Vải tuyết mưa cao cấp', 'Set áo blazer và quần', 'Tone be hiện đại', 'Tôn dáng thanh lịch']), 
    discount: 10 
  },
  { 
    id: '18', 
    name: 'Set Áo Quần Nỉ Thể Thao Unisex', 
    price: 690000, 
    category: 'Bộ', 
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop', 
    description: 'Set đồ nỉ da cá thể thao năng động gồm áo nỉ và quần bo gấu. Chất liệu ấm áp, co giãn thoải mái cho các hoạt động thường ngày.', 
    features: JSON.stringify(['Nỉ da cá cao cấp', 'Phong cách thể thao', 'Form Unisex rộng rãi', 'Bo gấu giữ nhiệt']), 
    discount: 0 
  },
  { 
    id: '19', 
    name: 'Đầm Lụa Satin Dáng Suông Cổ V', 
    price: 890000, 
    category: 'Váy', 
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop', 
    description: 'Đầm lụa satin bóng mượt dáng dài suông rũ nhẹ nhàng. Thiết kế cổ V thanh lịch, mang lại vẻ quyến rũ cho những buổi tiệc tối.', 
    features: JSON.stringify(['Lụa satin cao cấp', 'Bóng mượt sang trọng', 'Dáng suông thon gọn', 'Không nhăn']), 
    discount: 15 
  },
  { 
    id: '20', 
    name: 'Chân Váy Xếp Ly Dáng Dài Midi', 
    price: 480000, 
    category: 'Váy', 
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=800&auto=format&fit=crop', 
    description: 'Chân váy dập ly dáng dài phong cách Hàn Quốc dịu dàng. Cạp chun co giãn linh hoạt, dễ phối cùng áo thun, sweater và sơ mi.', 
    features: JSON.stringify(['Dập ly sắc nét', 'Dáng dài che khuyết điểm', 'Lưng thun co giãn', 'Vải voan mềm mại']), 
    discount: 0 
  },
  { 
    id: '21', 
    name: 'Giày Loafer Da Bóng Cổ Điển', 
    price: 850000, 
    category: 'Giày', 
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop', 
    description: 'Giày lười loafer da bóng phong cách học đường vintage cổ điển. Đế đệm êm chân chống trượt, nâng chiều cao nhẹ 3cm.', 
    features: JSON.stringify(['Da tổng hợp cao cấp', 'Đế đệm êm ái', 'Đế cao 3cm', 'Chống trơn trượt']), 
    discount: 0 
  },
  { 
    id: '22', 
    name: 'Giày Cao Gót Mũi Nhọn 7cm Da Mờ', 
    price: 790000, 
    category: 'Giày', 
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop', 
    description: 'Giày cao gót mũi nhọn gót mảnh 7cm tôn dáng vóc chuẩn đẹp. Da mờ thanh lịch, lót đệm siêu êm cho cả ngày di chuyển.', 
    features: JSON.stringify(['Gót cao 7cm', 'Mũi nhọn hack dáng', 'Lót đệm siêu êm', 'Da mờ sang trọng']), 
    discount: 10 
  },
  { 
    id: '23', 
    name: 'Thắt Lưng Da Nam Khóa Kim Loại', 
    price: 320000, 
    category: 'Phụ kiện', 
    image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=800&auto=format&fit=crop', 
    description: 'Thắt lưng da bò thật bề mặt bóng mờ, khóa kim loại không gỉ cao cấp. Phụ kiện hoàn hảo cho quần tây và quần jeans.', 
    features: JSON.stringify(['Da bò thật 100%', 'Mặt khóa kim loại sang trọng', 'Dễ điều chỉnh size', 'Độ bền cao']), 
    discount: 0 
  },
  { 
    id: '24', 
    name: 'Mũ Nồi Beret Len Vintage Nữ', 
    price: 220000, 
    category: 'Phụ kiện', 
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop', 
    description: 'Mũ beret chất liệu len dệt ấm áp phong cách quý cô Paris cổ điển. Thiết kế tối giản dễ phối đồ thu đông.', 
    features: JSON.stringify(['Len dệt cao cấp', 'Phong cách vintage', 'Giữ ấm đầu', 'Màu đen basic']), 
    discount: 0 
  },
  { 
    id: '25', 
    name: 'Set Đồ Dệt Kim Áo & Chân Váy', 
    price: 920000, 
    category: 'Bộ', 
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop', 
    description: 'Set đồ dệt kim cao cấp gồm áo cổ tròn và chân váy ôm tôn dáng. Chất len dệt mềm mịn ấm áp, tôn lên vẻ nữ tính sang trọng.', 
    features: JSON.stringify(['Len dệt kim mềm mịn', 'Tôn dáng thon thả', 'Giữ ấm nhẹ', 'Thiết kế tone sur tone']), 
    discount: 5 
  },
  { 
    id: '26', 
    name: 'Đầm Maxi Đi Biển Họa Tiết Boho', 
    price: 750000, 
    category: 'Váy', 
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop', 
    description: 'Đầm maxi hai dây dáng dài bay bổng họa tiết phong cách Bohemian. Chất vải lanh thoáng mát, lý tưởng cho những chuyến du lịch mùa hè.', 
    features: JSON.stringify(['Vải lanh đũi thoáng mát', 'Họa tiết Bohemian', 'Dáng maxi bay bổng', 'Dây áo điều chỉnh']), 
    discount: 0 
  }
];

async function initDatabase() {
  try {
    // Kết nối tới MySQL Server trước (chưa cần database)
    const serverConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });
    await serverConnection.query('CREATE DATABASE IF NOT EXISTS thoitranghd_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    await serverConnection.end();

    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Đã kết nối tới MySQL database: thoitranghd_db');

    // Tạo bảng products
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        original_price INT NULL,
        discount INT DEFAULT 0,
        category VARCHAR(100),
        image TEXT,
        description TEXT,
        features TEXT,
        stock INT NOT NULL DEFAULT 50,
        sold_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('📦 Bảng `products` đã tạo thành công.');

    // Tạo bảng orders
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_code VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        payment_method VARCHAR(50),
        voucher_code VARCHAR(50) NULL,
        subtotal INT NOT NULL,
        discount_amount INT DEFAULT 0,
        total_price INT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('📑 Bảng `orders` đã tạo thành công.');

    // Tạo bảng order_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id VARCHAR(50),
        product_name VARCHAR(255),
        price INT,
        quantity INT,
        size VARCHAR(20),
        color VARCHAR(50),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('🛒 Bảng `order_items` đã tạo thành công.');

    // Tạo bảng vouchers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        code VARCHAR(50) PRIMARY KEY,
        discount_type VARCHAR(20) NOT NULL,
        value INT NOT NULL,
        min_spend INT NOT NULL DEFAULT 0,
        usage_limit INT NOT NULL DEFAULT 100,
        times_used INT NOT NULL DEFAULT 0,
        min_vip_level INT NOT NULL DEFAULT 0,
        expires_at DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('🎟️ Bảng `vouchers` đã tạo thành công.');

    // Tạo bảng users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('👤 Bảng `users` đã tạo thành công.');

    // Tạo bảng favorites
    await connection.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        product_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('❤️ Bảng `favorites` đã tạo thành công.');

    // Tạo bảng reviews
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        user_id INT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_avatar TEXT NULL,
        rating INT NOT NULL DEFAULT 5,
        comment TEXT NOT NULL,
        order_id INT NULL,
        size VARCHAR(20) NULL,
        color VARCHAR(50) NULL,
        is_verified_purchase BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (product_id),
        INDEX (user_id),
        INDEX (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('⭐ Bảng `reviews` đã tạo thành công.');

    // Đảm bảo bảng orders có cột user_id
    try {
      await connection.query(`ALTER TABLE orders ADD COLUMN user_id INT NULL AFTER id;`);
    } catch (e) {
      // Cột user_id đã tồn tại, bỏ qua
    }

    // Đảm bảo bảng orders có cột voucher_code
    try {
      await connection.query(`ALTER TABLE orders ADD COLUMN voucher_code VARCHAR(50) NULL AFTER payment_method;`);
    } catch (e) {
      // Cột voucher_code đã tồn tại, bỏ qua
    }

    // Đảm bảo bảng vouchers có cột min_vip_level
    try {
      await connection.query(`ALTER TABLE vouchers ADD COLUMN min_vip_level INT NOT NULL DEFAULT 0 AFTER times_used;`);
    } catch (e) {
      // Cột min_vip_level đã tồn tại, bỏ qua
    }

    // Đồng bộ sản phẩm mẫu vào products
    for (const p of initialProducts) {
      await connection.query(
        `INSERT INTO products (id, name, price, original_price, category, image, description, features, discount) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name = VALUES(name), 
           price = VALUES(price), 
           category = VALUES(category), 
           image = VALUES(image), 
           description = VALUES(description), 
           features = VALUES(features), 
           discount = VALUES(discount)`,
        [p.id, p.name, p.price, p.original_price || null, p.category, p.image, p.description, p.features, p.discount || 0]
      );
    }
    console.log(`🎉 Đã đồng bộ ${initialProducts.length} sản phẩm mẫu vào bảng \`products\`.`);

    // Chèn vouchers mẫu
    const [vRows] = await connection.query('SELECT COUNT(*) as count FROM vouchers');
    if (vRows[0].count === 0) {
      await connection.query(`INSERT INTO vouchers (code, discount_type, value) VALUES
        ('HD10', 'percent', 10),
        ('HD20', 'percent', 20),
        ('HD50K', 'fixed', 50000)
      `);
      console.log('🎉 Đã thêm mã giảm giá mẫu vào bảng `vouchers`.');
    }

    // Chèn đánh giá mẫu cho các sản phẩm
    const [revRows] = await connection.query('SELECT COUNT(*) as count FROM reviews');
    if (revRows[0].count === 0) {
      const sampleReviews = [
        {
          product_id: '1',
          user_name: 'Nguyễn Thu Trang',
          user_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Áo vải cotton 100% dày dặn nhưng mặc rất mát và thấm hút mồ hôi tốt. Chữ thêu HOTEL sắc nét, giặt máy không lo bong tróc. Size M vừa người chuẩn đẹp!',
          size: 'M',
          color: 'Trắng',
          created_at: '2026-03-10 14:30:00'
        },
        {
          product_id: '1',
          user_name: 'Trần Hoàng Nam',
          user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Form unisex mặc thoải mái, đường may cẩn thận, không có chỉ thừa. Đóng gói hộp rất lịch sự. Sẽ ủng hộ shop tiếp!',
          size: 'L',
          color: 'Đen',
          created_at: '2026-03-12 09:15:00'
        },
        {
          product_id: '1',
          user_name: 'Lê Minh Tuấn',
          user_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
          rating: 4,
          comment: 'Chất lượng ổn áp so với tầm giá. Giao hàng nhanh, shipper thân thiện. Form áo rộng rãi đúng kiểu trẻ trung.',
          size: 'XL',
          color: 'Trắng',
          created_at: '2026-03-14 16:45:00'
        },
        {
          product_id: '2',
          user_name: 'Phạm Đăng Khoa',
          user_avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Hình in graphic sắc nét, phối màu cực chất. Chất thun co giãn 4 chiều mặc đi chơi rất hợp.',
          size: 'L',
          color: 'Đen',
          created_at: '2026-03-08 11:20:00'
        },
        {
          product_id: '2',
          user_name: 'Đỗ Quốc Bảo',
          user_avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Rất thích form áo streetwear này, mặc lên tôn dáng và năng động. Cho shop 5 sao!',
          size: 'M',
          color: 'Đen',
          created_at: '2026-03-11 18:05:00'
        },
        {
          product_id: '3',
          user_name: 'Nguyễn Hải Yến',
          user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Màu xanh mint pastel bên ngoài xinh xỉu luôn mn ơi! Vải nỉ da cá ấm áp mà không bị bí, không hề xù lông.',
          size: 'M',
          color: 'Mint',
          created_at: '2026-03-05 13:10:00'
        },
        {
          product_id: '3',
          user_name: 'Vũ Đức Thắng',
          user_avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Áo dày dặn, bo tay và cổ chuẩn form. Mặc mùa này cực kỳ thích hợp.',
          size: 'L',
          color: 'Mint',
          created_at: '2026-03-09 20:30:00'
        },
        {
          product_id: '4',
          user_name: 'Bùi Phương Thảo',
          user_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Đầm đẹp xuất sắc luôn ạ! Tôn eo và che khuyết điểm rất tốt. Vải voan mềm rũ bay bổng, mặc đi tiệc hoặc du lịch chụp ảnh siêu nổi bật.',
          size: 'M',
          color: 'Đỏ',
          created_at: '2026-03-01 15:00:00'
        },
        {
          product_id: '4',
          user_name: 'Hoàng Bích Ngọc',
          user_avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Váy có lớp lót kín đáo, hoa văn vintage sang chảnh. Ai cũng khen đầm đẹp.',
          size: 'S',
          color: 'Đỏ',
          created_at: '2026-03-07 10:45:00'
        },
        {
          product_id: '5',
          user_name: 'Lê Văn Hưng',
          user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Áo basic không thể thiếu trong tủ đồ, cotton mịn mát, cổ áo may chắc chắn không bị bai dão.',
          size: 'L',
          color: 'Trắng',
          created_at: '2026-03-15 08:30:00'
        },
        {
          product_id: '6',
          user_name: 'Đặng Thanh Hằng',
          user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Denim dày dặn đúng chuẩn, chi tiết rách và huy hiệu rất cá tính. Mặc lên hack chân dài miên man!',
          size: 'M',
          color: 'Xanh Denim',
          created_at: '2026-03-14 17:15:00'
        },
        {
          product_id: '7',
          user_name: 'Nguyễn Minh Quang',
          user_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Form blazer Hàn Quốc đứng dáng, chất vải tuyết mưa cao cấp, tone màu be rất sang. Rất đáng đồng tiền bát gạo!',
          size: 'L',
          color: 'Be',
          created_at: '2026-03-12 19:20:00'
        },
        {
          product_id: '8',
          user_name: 'Phan Mỹ Linh',
          user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
          rating: 5,
          comment: 'Quần cạp cao mặc vào chân dài thêm mấy phần luôn, vải không nhăn đi làm cả ngày vẫn đứng form.',
          size: 'M',
          color: 'Đen',
          created_at: '2026-03-13 14:10:00'
        }
      ];

      for (const rev of sampleReviews) {
        await connection.query(
          `INSERT INTO reviews (product_id, user_name, user_avatar, rating, comment, size, color, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [rev.product_id, rev.user_name, rev.user_avatar, rev.rating, rev.comment, rev.size, rev.color, rev.created_at]
        );
      }
      console.log(`🎉 Đã thêm ${sampleReviews.length} đánh giá mẫu vào bảng \`reviews\`.`);
    }

    await connection.end();
    console.log('✨ Khởi tạo CSDL hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi khởi tạo CSDL:', error.message);
  }
}

initDatabase();
