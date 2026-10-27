const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
};

const EXTRA_PRODUCTS = [
  // 1. Áo (Cần thêm ~12)
  { name: 'Áo Polo Nam Phối Cổ Dệt Bo Cotton Compact', price: 380000, category: 'Áo', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop', desc: 'Chất liệu cotton compact co giãn 4 chiều mềm mịn, thấm hút mồ hôi tối ưu.' },
  { name: 'Áo Thun Dài Tay Cổ Lọ Thu Đông Minimalist', price: 320000, category: 'Áo', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800&auto=format&fit=crop', desc: 'Áo thun dài tay cổ lọ ấm áp, kiểu dáng ôm nhẹ chuẩn phong cách Hàn Quốc.' },
  { name: 'Áo Sơ Mi Nam Oxford Dài Tay Chống Nhăn', price: 450000, category: 'Áo', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop', desc: 'Chất vải Oxford dày dặn dệt chéo, giữ form cổ áo cứng cáp cả ngày.' },
  { name: 'Áo Len Nam Cổ Tròn Dệt Kim Họa Tiết Vặn Thừng', price: 520000, category: 'Áo', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop', desc: 'Sợi len tự nhiên giữ ấm hoàn hảo, dệt vặn thừng cổ điển sang trọng.' },
  { name: 'Áo Khoác Bomber Gió 2 Lớp Chống Nước', price: 590000, category: 'Áo', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop', desc: 'Vải dù tráng nano chống thấm nước và cản gió, bo chun gấu co giãn.' },
  { name: 'Áo Khoác Denim Nam Rách Nhẹ Form Rộng', price: 680000, category: 'Áo', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&auto=format&fit=crop', desc: 'Denim cao cấp 12oz đã qua xử lý wash mềm, phong cách streetwear khỏe khoắn.' },
  { name: 'Áo Thun Unisex In Họa Tiết Typo Vintage', price: 290000, category: 'Áo', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop', desc: 'Hình in kéo lụa bền màu, không bong tróc, chất vải 100% cotton thoáng mát.' },
  { name: 'Áo Sơ Mi Nữ Lụa Satin Cổ V Thanh Lịch', price: 420000, category: 'Áo', image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=800&auto=format&fit=crop', desc: 'Lụa satin óng ả mềm rủ, tôn nét quý phái dịu dàng nơi công sở.' },
  { name: 'Áo Cardigan Nữ Dệt Kim Nút Gỗ Vintage', price: 460000, category: 'Áo', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800&auto=format&fit=crop', desc: 'Cardigan mỏng nhẹ phối cùng áo 2 dây hoặc sơ mi rất xinh xắn.' },
  { name: 'Áo Hoodie Nỉ Bông Unisex Túi Kangaroo', price: 490000, category: 'Áo', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop', desc: 'Nỉ bông lót mặt trong cực ấm, mũ 2 lớp đứng form có dây rút.' },
  { name: 'Áo Blazer Nam 2 Hàng Khuy Phong Cách Smart Casual', price: 890000, category: 'Áo', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop', desc: 'Thiết kế vai đệm nhẹ tự nhiên, phối hoàn hảo cùng áo thun và quần tây.' },
  { name: 'Áo Tanktop Thể Thao Nam Siêu Nhẹ Khô Nhanh', price: 210000, category: 'Áo', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop', desc: 'Chuyên dụng tập gym, chạy bộ với công nghệ Quick-Dry thoáng khí.' },

  // 2. Quần (Cần thêm ~14)
  { name: 'Quần Tây Nam Form Slimfit Vải Co Giãn Chống Nhăn', price: 490000, category: 'Quần', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop', desc: 'Thiết kế tăng giảm cạp thông minh 4cm, tôn dáng chân thon gọn.' },
  { name: 'Quần Jean Nam Ống Đứng Regular Fit Xanh Retro', price: 550000, category: 'Quần', image: 'https://images.unsplash.com/photo-1542272604-780c96856592?q=80&w=800&auto=format&fit=crop', desc: 'Jeans cotton pha spandex co giãn, wash màu xanh cổ điển thanh lịch.' },
  { name: 'Quần Kaki Nam Túi Chéo Dáng Baggy Năng Động', price: 420000, category: 'Quần', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop', desc: 'Kaki wash mềm đã xử lý độ co rút, mặc cực kỳ thoải mái khi vận động.' },
  { name: 'Quần Short Kaki Nam Đi Chơi Dáng Ngang Gối', price: 320000, category: 'Quần', image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=800&auto=format&fit=crop', desc: 'Short hè thoáng mát, túi sâu đựng ví điện thoại vô tư.' },
  { name: 'Quần Jogger Nỉ Thể Thao Bo Gấu Unisex', price: 390000, category: 'Quần', image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?q=80&w=800&auto=format&fit=crop', desc: 'Vải nỉ chân cua cao cấp, cạp chun có dây rút chắc chắn.' },
  { name: 'Quần Jean Nữ Lưng Siêu Cao Ống Loe Tôn Dáng', price: 520000, category: 'Quần', image: 'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?q=80&w=800&auto=format&fit=crop', desc: 'Hiệu ứng kéo dài chân tuyệt đối, cạp ôm khít eo quyến rũ.' },
  { name: 'Quần Baggy Vải Nữ Công Sở Xếp Ly Trước', price: 410000, category: 'Quần', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop', desc: 'Form quần chuẩn che khuyết điểm đùi to, cạp lưng cao tôn eo.' },
  { name: 'Quần Ống Rộng Nữ Suông Dài Vải Tuyết Mưa', price: 430000, category: 'Quần', image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?q=80&w=800&auto=format&fit=crop', desc: 'Vải tuyết mưa mịn mát không xù lông, mặc nhẹ tênh bay dáng.' },
  { name: 'Quần Short Nữ Jeans Rách Gấu Tua Rua Cá Tính', price: 290000, category: 'Quần', image: 'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?q=80&w=800&auto=format&fit=crop', desc: 'Short jeans hè năng động, dễ dàng phối cùng croptop hoặc áo thun.' },
  { name: 'Quần Cargo Kaki Nam Túi Hộp Đa Năng Phong Cách Lính', price: 560000, category: 'Quần', image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&auto=format&fit=crop', desc: 'Nhiều ngăn túi hộp tiện dụng, phong cách dã ngoại du lịch bụi bặm.' },
  { name: 'Quần Chinos Nam Màu Xám Tro Thanh Lịch', price: 470000, category: 'Quần', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop', desc: 'Màu xám trung tính dễ phối mọi màu áo, chất vải thoáng mát mùa hè.' },
  { name: 'Quần Legging Nữ Cạp Cao Nâng Mông Co Giãn 4 Chiều', price: 280000, category: 'Quần', image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=800&auto=format&fit=crop', desc: 'Chuyên dụng tập yoga, gym hoặc mặc thường ngày thoải mái.' },
  { name: 'Quần Culottes Nữ Vải Đũi Tự Nhiên Mát Mẻ', price: 350000, category: 'Quần', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop', desc: 'Vải đũi mộc thiên nhiên, thấm hút mồ hôi tối đa ngày nắng nóng.' },
  { name: 'Quần Short Dù Thể Thao Nam 2 Lớp Có Túi Đựng Điện Thoại', price: 260000, category: 'Quần', image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=800&auto=format&fit=crop', desc: 'Lớp lót trong chống cọ xát đùi khi chạy bộ đường dài.' },

  // 3. Váy (Cần thêm ~14)
  { name: 'Đầm Nữ Dáng Xòe Voan Hoa Nhí Cổ Vuông Tay Phồng', price: 480000, category: 'Váy', image: 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?q=80&w=800&auto=format&fit=crop', desc: 'Họa tiết hoa nhí vintage ngọt ngào, tùng váy xòe bồng bềnh nữ tính.' },
  { name: 'Đầm Body Nữ Cổ Yếm Khoét Lưng Quyến Rũ Dự Tiệc', price: 590000, category: 'Váy', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop', desc: 'Chất thun gân ôm sát đường cong cơ thể, màu đen huyền bí sang chảnh.' },
  { name: 'Chân Váy Chữ A Xếp Ly Phong Cách Nữ Sinh Hàn Quốc', price: 290000, category: 'Váy', image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=800&auto=format&fit=crop', desc: 'Kèm quần bảo hộ bên trong an toàn, xếp ly tỉ mỉ không sợ mất nếp.' },
  { name: 'Chân Váy Bút Chì Công Sở Xẻ Tà Tinh Tế', price: 360000, category: 'Váy', image: 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?q=80&w=800&auto=format&fit=crop', desc: 'Cắt may chuẩn form ôm trọn vòng hông, xẻ tà sau bước đi nhẹ nhàng.' },
  { name: 'Đầm Sơ Mi Nữ Kèm Thắt Lưng Bản Nhỏ Thanh Lịch', price: 510000, category: 'Váy', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop', desc: 'Họa tiết kẻ sọc thanh thoát, đai thắt eo tạo tỷ lệ dáng người hoàn hảo.' },
  { name: 'Chân Váy Midi Xòe Tầng Vải Tơ Thơ Mộng Đi Biển', price: 440000, category: 'Váy', image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop', desc: 'Lớp lót kín đáo, tùng váy bay bổng tuyệt đẹp khi chụp hình ngoài trời.' },
  { name: 'Đầm Nữ 2 Dây Lụa Cổ Đổ Quyến Rũ Party Night', price: 540000, category: 'Váy', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop', desc: 'Chất lụa cao cấp óng ả, quai áo tùy chỉnh độ dài linh hoạt.' },
  { name: 'Đầm Babydoll Nữ Cổ Sen Dễ Thương Che Khuyết Điểm', price: 390000, category: 'Váy', image: 'https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f?q=80&w=800&auto=format&fit=crop', desc: 'Dáng suông rộng thoáng mát giấu dáng cực tốt cho nàng mũm mĩm.' },
  { name: 'Chân Váy Jeans Dài Qua Gối Xẻ Trước Năng Động', price: 460000, category: 'Váy', image: 'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?q=80&w=800&auto=format&fit=crop', desc: 'Jeans wash mềm, xẻ trước hiện đại phối sneaker cực chất.' },
  { name: 'Đầm Maxi Đi Biển Hở Lưng Họa Tiết Tropical Rực Rỡ', price: 620000, category: 'Váy', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop', desc: 'Thiết kế maxi thướt tha, chất voan tơ cao cấp không nhăn.' },
  { name: 'Đầm Vest Nữ Công Sở Cổ Sam Sang Trọng', price: 690000, category: 'Váy', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop', desc: 'Phong cách nữ tổng tài đĩnh đạc, đính cúc kim loại mạ vàng sang trọng.' },
  { name: 'Chân Váy Kaki Xòe Dáng Dài Kèm Thắt Lưng Vintage', price: 420000, category: 'Váy', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&auto=format&fit=crop', desc: 'Tone be cổ điển, có túi 2 bên hông tiện dụng để điện thoại.' },
  { name: 'Đầm Len Nữ Dài Tay Cổ Lọ Thu Đông Ấm Áp', price: 570000, category: 'Váy', image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop', desc: 'Sợi len dệt gân co giãn êm ái, giữ nhiệt cơ thể xuất sắc.' },
  { name: 'Đầm Nữ Trễ Vai Bèo Tầng Duyên Dáng Dạo Phố', price: 490000, category: 'Váy', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop', desc: 'Bo chun ngực chắc chắn không tuột, khoe khéo bờ vai thon thả.' },

  // 4. Bộ (Cần thêm ~14)
  { name: 'Set Bộ Thể Thao Nam Áo Hoodie & Quần Jogger Nỉ Bông', price: 790000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop', desc: 'Bộ đồ nỉ thu đông cao cấp, phối sọc tay khỏe khoắn năng động.' },
  { name: 'Set Blazer & Quần Tây Nữ Tone Màu Pastel Nhã Nhặn', price: 950000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop', desc: 'Bộ vest công sở thanh lịch, cúc đồng thời thượng, vải may 2 lớp đứng dáng.' },
  { name: 'Set Áo Croptop & Chân Váy Chữ A Dệt Kim Thu Đông', price: 590000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop', desc: 'Chất len dệt mềm mại, tôn dáng eo thon và đôi chân dài miên man.' },
  { name: 'Bộ Pijama Lụa Nữ Dài Tay Họa Tiết Sang Trọng Mặc Nhà', price: 420000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop', desc: 'Lụa băng mát lạnh mịn da, viền chỉ may sắc sảo không bai dão.' },
  { name: 'Set Đồ Thể Thao Nữ Áo Thun & Quần Biker Short Năng Động', price: 390000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop', desc: 'Chất thun gân tăm co giãn thể thao, mặc tập gym hoặc dạo phố đều đẹp.' },
  { name: 'Set Vest Nam 3 Món (Áo Khoác, Ghi-lê & Quần Âu) Lịch Lãm', price: 1850000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800&auto=format&fit=crop', desc: 'Chuyên dụng tiệc cưới, sự kiện quan trọng, may đo chuẩn tỷ lệ âu phục.' },
  { name: 'Set Bộ Đũi Nam Áo Cổ Tàu & Quần Dài Mộc Mạc Đi Chùa', price: 580000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?q=80&w=800&auto=format&fit=crop', desc: 'Đũi xước tự nhiên thoáng khí, phom dáng rộng rãi an lạc thoải mái.' },
  { name: 'Set Áo Tweed & Chân Váy Dạ Tiểu Thư Sang Chảnh', price: 820000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop', desc: 'Vải dạ tweed cao cấp dệt sợi kim tuyến lấp lánh, đính nơ tinh xảo.' },
  { name: 'Bộ Mặc Nhà Cotton Nam Áo Cộc Tay Quần Đùi Thoáng Mát', price: 320000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop', desc: '100% cotton chải kỹ không xơ, thấm hút mồ hôi tối đa cả ngày hè.' },
  { name: 'Set Đồ Đi Biển Unisex Áo Sơ Mi Hawaii & Quần Short Cây Dừa', price: 450000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop', desc: 'Họa tiết nhiệt đới rực rỡ sắc màu, chất lụa đũi mỏng mát bay phấp phới.' },
  { name: 'Set Áo Len Gile & Sơ Mi Trắng Phong Cách Vintage', price: 540000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop', desc: 'Phối sẵn 2 món kinh điển chuẩn phong cách thư sinh tri thức.' },
  { name: 'Set Bộ Tập Gym Yoga Nữ Áo Bra & Quần Dài Nâng Mông', price: 480000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop', desc: 'Chất vải dệt không đường may (seamless) đàn hồi cực tốt, ôm sát cơ bắp.' },
  { name: 'Set Bộ Kaki Nữ Áo Khoác Dáng Lửng & Chân Váy Cargo', price: 650000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&auto=format&fit=crop', desc: 'Phong cách Y2K bụi bặm cá tính, túi hộp tiện lợi cực ngầu.' },
  { name: 'Set Đồ Bơi Nữ 2 Mảnh Kèm Khăn Choàng Voan Điệu Đà', price: 520000, category: 'Bộ', image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop', desc: 'Có mút ngực nâng êm ái, màu sắc tôn da rực rỡ dưới nắng biển.' },

  // 5. Giày (Cần thêm ~14)
  { name: 'Giày Sneaker Thể Thao Nam Đế Khí Êm Chân Siêu Nhẹ', price: 750000, category: 'Giày', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', desc: 'Đế đệm khí êm ái đàn hồi cao, thân giày dệt lưới thoáng khí chống hôi chân.' },
  { name: 'Giày Tây Nam Oxford Da Bò Thật Cột Dây Sang Trọng', price: 1250000, category: 'Giày', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop', desc: 'Da bò full-grain nguyên tấm cao cấp, đế khâu Goodyear bền bỉ trọn đời.' },
  { name: 'Giày Lười Loafer Nam Da Bóng Khóa Kim Loại Đẳng Cấp', price: 920000, category: 'Giày', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop', desc: 'Xỏ chân êm ái nhanh chóng, phối cùng quần tây hoặc kaki đều cực bảnh.' },
  { name: 'Giày Cao Gót Nữ Mũi Nhọn 7cm Đính Đá Pha Lê Lấp Lánh', price: 650000, category: 'Giày', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop', desc: 'Gót thanh chắc chắn chống xiêu vẹo, lót đệm êm ngón chân cả ngày dài.' },
  { name: 'Giày Sandal Nữ Quai Mảnh Đế Vuông 5cm Dễ Đi', price: 420000, category: 'Giày', image: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?q=80&w=800&auto=format&fit=crop', desc: 'Thiết kế quai thanh lịch ôm cổ chân, phối đầm xòe hoặc quần jeans đều xinh.' },
  { name: 'Giày Sneaker Nữ Cổ Thấp Trắng Tinh Khôi Dáng Hàn Quốc', price: 580000, category: 'Giày', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop', desc: 'Đế bánh mì tăng chiều cao 4cm bí mật, dễ dàng lau chùi vệ sinh.' },
  { name: 'Giày Búp Bê Nữ Mũi Vuông Đính Nơ Da Mềm Êm Chân', price: 380000, category: 'Giày', image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=800&auto=format&fit=crop', desc: 'Gấp gọn tiện lợi trong túi xách, chuyên dụng cho nàng công sở đi lại nhiều.' },
  { name: 'Giày Boots Nữ Cổ Lửng Da Bóng Khóa Kéo Thời Thượng', price: 790000, category: 'Giày', image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=800&auto=format&fit=crop', desc: 'Đế răng cưa chống trơn trượt mùa mưa lạnh, phối chân váy dạ cực cá tính.' },
  { name: 'Giày Lười Slip-on Unisex Vải Canvas Màu Trắng Sữa', price: 350000, category: 'Giày', image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=800&auto=format&fit=crop', desc: 'Canvas dày dặn thoáng mát, đế cao su lưu hóa chống mài mòn xuất sắc.' },
  { name: 'Giày Sandal Nam Quai Dù Đi Mưa Siêu Bền Chống Nước', price: 360000, category: 'Giày', image: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?q=80&w=800&auto=format&fit=crop', desc: 'Đế đúc chống trượt bám dính tốt, quai dán xé Velcro điều chỉnh size dễ dàng.' },
  { name: 'Giày Thể Thao Nam Chạy Bộ Đệm Boost Giảm Chấn Đột Phá', price: 890000, category: 'Giày', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', desc: 'Hỗ trợ vòm bàn chân bảo vệ khớp gối khi chạy cự ly 10km trở lên.' },
  { name: 'Giày Chelsea Boots Nam Da Lộn Cổ Thun Phong Trần', price: 980000, category: 'Giày', image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=800&auto=format&fit=crop', desc: 'Da lộn bò nhập khẩu màu nâu camel, phong cách rock & roll kinh điển.' },
  { name: 'Dép Sục Bít Mũi Unisex Lót Lông Siêu Ấm Đi Trong Nhà', price: 180000, category: 'Giày', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800&auto=format&fit=crop', desc: 'Lớp lông nhung mịn màng giữ ấm bàn chân trọn vẹn trong mùa đông.' },
  { name: 'Giày Mule Nữ Hở Gót Da Mềm Cài Khóa Kim Loại Sang Chảnh', price: 460000, category: 'Giày', image: 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?q=80&w=800&auto=format&fit=crop', desc: 'Kiểu dáng tiện lợi xỏ vào đi ngay, tạo cảm giác đôi chân dài thon gọn.' },

  // 6. Phụ kiện (Cần thêm ~14)
  { name: 'Thắt Lưng Nam Da Bò Thật Mặt Khóa Tự Động Hợp Kim', price: 350000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=800&auto=format&fit=crop', desc: 'Khóa trượt không cần đục lỗ tiện dụng, da bò 2 lớp chống bong tróc nứt gãy.' },
  { name: 'Ví Nam Da Bò Dáng Đứng Khắc Laser Chống Trộm RFID', price: 380000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop', desc: 'Tích hợp lớp lót kim loại chặn sóng vô tuyến bảo vệ thẻ ngân hàng tuyệt đối.' },
  { name: 'Kính Mát Nam Mắt Vuông Phân Cực Polarized Chống Tia UV400', price: 450000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop', desc: 'Tròng kính chống chói lóa khi lái xe trời nắng gắt, gọng titan siêu nhẹ.' },
  { name: 'Đồng Hồ Nam Dây Da Thật 6 Kim Chức Năng Chronograph', price: 1650000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop', desc: 'Mặt kính sapphire chống trầy xước, chịu nước 5ATM đi mưa rửa tay thoải mái.' },
  { name: 'Cà Vạt Lụa Nam Họa Tiết Kẻ Chéo Kèm Kẹp Cà Vạt Cao Cấp', price: 250000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?q=80&w=800&auto=format&fit=crop', desc: 'Bộ quà tặng đóng hộp sang trọng cho nam giới, lụa dệt mật độ cao sắc nét.' },
  { name: 'Khăn Choàng Cổ Nữ Cashmere Dạ Ấm Họa Tiết Kẻ Caro', price: 380000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop', desc: 'Sợi len cashmere siêu êm mềm mượt như mây, giữ ấm cổ họng ngày đại hàn.' },
  { name: 'Mũ Len Beanie Unisex Dệt Gân Ấm Áp Mùa Đông', price: 160000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop', desc: 'Sợi len acrylic giữ ấm, co giãn tốt đội không bị đau đầu hay ngứa trán.' },
  { name: 'Găng Tay Da Cừu Nữ Cảm Ứng Màn Hình Điện Thoại', price: 320000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop', desc: 'Đầu ngón tay phủ sợi dẫn điện lướt smartphone nhạy bén, lót nhung ấm.' },
  { name: 'Vòng Tay Đôi Bạc Ý 925 Khắc Tên Tình Nhân Ý Nghĩa', price: 480000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1611591475152-478d13b6676f?q=80&w=800&auto=format&fit=crop', desc: 'Bạc chuẩn quốc tế không gây dị ứng da, độ sáng bóng bền bỉ cùng năm tháng.' },
  { name: 'Bông Tai Nữ Bạc Nụ Đính Ngọc Trai Nuôi Tự Nhiên', price: 290000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop', desc: 'Ngọc trai nước ngọt sáng ánh ngũ sắc, chốt bạc chắc chắn không sợ rơi.' },
  { name: 'Túi Đeo Chéo Nam Mini Vải Oxford Chống Thấm Đi Chơi', price: 280000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop', desc: 'Ngăn nhỏ gọn đựng vừa passport, điện thoại, sạc dự phòng, chìa khóa xe.' },
  { name: 'Mũ Tai Bèo Đi Rừng Kèm Khăn Trùm Chống Nắng Toàn Diện', price: 210000, category: 'Phụ kiện', image: '/uploads/img-1789715089647-852922075.jpg', desc: 'Vành rộng 12cm che chắn trọn vẹn khuôn mặt và gáy khi đi dã ngoại.' },
  { name: 'Bộ 5 Đôi Tất Cổ Ngắn Khử Mùi Kháng Khuẩn Nano Bạc', price: 120000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?q=80&w=800&auto=format&fit=crop', desc: 'Cotton dệt kim viền silicon gót chân chống tuột, thông thoáng cả ngày.' },
  { name: 'Ô Gấp Gọn Tự Động 2 Chiều Khung Hợp Kim Cản Gió UV50+', price: 260000, category: 'Phụ kiện', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop', desc: 'Một nút bấm đóng mở tiện lợi, tráng bạc chống nắng nóng và chống ướt mưa.' }
];

const EXTRA_USERS = [
  { name: 'Nguyễn Văn Hùng', email: 'hung.nguyenvan@gmail.com', phone: '0912111222', address: 'Số 15 Lê Duẩn, Hoàn Kiếm, Hà Nội' },
  { name: 'Trần Thị Thu Thảo', email: 'thao.tranthithu@gmail.com', phone: '0988222333', address: '280 Nguyễn Đình Chiểu, Quận 3, TP.HCM' },
  { name: 'Phạm Minh Quang', email: 'quang.minhpham@gmail.com', phone: '0903333444', address: '99 Bạch Đằng, Hải Châu, Đà Nẵng' },
  { name: 'Lê Hoàng Long', email: 'long.hoangle@gmail.com', phone: '0934444555', address: '124 Điện Biên Phủ, Thanh Khê, Đà Nẵng' },
  { name: 'Đoàn Thanh Mai', email: 'mai.doanthanh@gmail.com', phone: '0975555666', address: 'Tòa Landmark 4, Bình Thạnh, TP.HCM' },
  { name: 'Bùi Anh Tuấn', email: 'tuan.buianh@gmail.com', phone: '0916666777', address: 'Số 48 Quán Sứ, Hoàn Kiếm, Hà Nội' },
  { name: 'Vũ Thị Kim Ngân', email: 'ngan.vukim@gmail.com', phone: '0947777888', address: 'Số 72 Nguyễn Huệ, Quận 1, TP.HCM' },
  { name: 'Đinh Quốc Bảo', email: 'bao.dinhquoc@gmail.com', phone: '0968888999', address: 'Số 33 Trần Phú, Ngô Quyền, Hải Phòng' },
  { name: 'Lý Gia Hân', email: 'han.lygia@gmail.com', phone: '0929999000', address: 'Số 500 Lê Hồng Phong, Vũng Tàu' },
  { name: 'Hồ Trọng Nhân', email: 'nhan.hotrong@gmail.com', phone: '0981122334', address: 'Số 18 Đại Lộ Bình Dương, Thủ Dầu Một' },
  { name: 'Tạ Minh Đức', email: 'duc.taminh@gmail.com', phone: '0902233445', address: 'Số 29 Võ Văn Kiệt, Ninh Kiều, Cần Thơ' },
  { name: 'Phan Như Quỳnh', email: 'quynh.phannhu@gmail.com', phone: '0933344556', address: 'Số 11 Nguyễn Trãi, Nha Trang, Khánh Hòa' },
  { name: 'Ngô Kiến Huy', email: 'huy.ngokien@gmail.com', phone: '0944455667', address: 'Số 88 Lê Lợi, TP. Huế, Thừa Thiên Huế' },
  { name: 'Lâm Khánh Chi', email: 'chi.lamkhanh@gmail.com', phone: '0965566778', address: 'Số 204 Hùng Vương, Pleiku, Gia Lai' },
  { name: 'Dương Triệu Vũ', email: 'vu.duongtrieu@gmail.com', phone: '0976677889', address: 'Số 59 Trần Hưng Đạo, Buôn Ma Thuột' },
  { name: 'Trịnh Thăng Bình', email: 'binh.trinhthang@gmail.com', phone: '0917788990', address: 'Số 16 Xuân Thủy, Cầu Giấy, Hà Nội' },
  { name: 'Cao Bá Quát', email: 'quat.caoba@gmail.com', phone: '0988899001', address: 'Số 77 Nguyễn Du, Hai Bà Trưng, Hà Nội' },
  { name: 'Lưu Diệc Phi', email: 'phi.luudiec@gmail.com', phone: '0909900112', address: 'Tòa Vinhomes Metropolis, Ba Đình, Hà Nội' },
  { name: 'Trương Ngọc Ánh', email: 'anh.truongngoc@gmail.com', phone: '0931011223', address: 'Số 82 Thảo Điền, TP. Thủ Đức, TP.HCM' },
  { name: 'Hà Kiều Anh', email: 'anh.hakieu@gmail.com', phone: '0942122334', address: 'Số 19 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM' },
  { name: 'Đặng Thu Thảo', email: 'thao.dangthu@gmail.com', phone: '0963233445', address: 'Khu Đô Thị Phú Mỹ Hưng, Quận 7, TP.HCM' },
  { name: 'Nguyễn Thị Huyền', email: 'huyen.nguyenthi@gmail.com', phone: '0974344556', address: 'Số 120 Lạch Tray, Ngô Quyền, Hải Phòng' },
  { name: 'Mai Phương Thúy', email: 'thuy.maiphuong@gmail.com', phone: '0985455667', address: 'Số 15 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội' },
  { name: 'Phạm Hương', email: 'huong.pham@gmail.com', phone: '0916566778', address: 'Số 45 Cầu Đất, Lê Chân, Hải Phòng' },
  { name: 'HHen Niê', email: 'nie.hhen@gmail.com', phone: '0907677889', address: 'Số 62 Lê Duẩn, Buôn Ma Thuột, Đắk Lắk' }
];

const EXTRA_VOUCHERS = [
  { code: 'SUMMER2026', discount_type: 'percent', value: 20, min_spend: 400000, usage_limit: 500, times_used: 12 },
  { code: 'HDVIP15', discount_type: 'percent', value: 15, min_spend: 300000, usage_limit: 300, times_used: 45 },
  { code: 'HDVIP25', discount_type: 'percent', value: 25, min_spend: 700000, usage_limit: 200, times_used: 18 },
  { code: 'SALEVIP50K', discount_type: 'fixed', value: 50000, min_spend: 450000, usage_limit: 400, times_used: 89 },
  { code: 'FREESHIPMAX', discount_type: 'fixed', value: 30000, min_spend: 200000, usage_limit: 1000, times_used: 320 },
  { code: 'FASHIONWEEK', discount_type: 'percent', value: 18, min_spend: 500000, usage_limit: 250, times_used: 24 },
  { code: 'HDMEMBER10', discount_type: 'percent', value: 10, min_spend: 250000, usage_limit: 500, times_used: 67 },
  { code: 'OFFICE20K', discount_type: 'fixed', value: 20000, min_spend: 250000, usage_limit: 300, times_used: 51 },
  { code: 'CASUAL15K', discount_type: 'fixed', value: 15000, min_spend: 200000, usage_limit: 300, times_used: 38 },
  { code: 'WEEKEND70K', discount_type: 'fixed', value: 70000, min_spend: 600000, usage_limit: 150, times_used: 42 },
  { code: 'BLACKFRIDAY', discount_type: 'percent', value: 30, min_spend: 1000000, usage_limit: 100, times_used: 85 },
  { code: 'HDFRIENDS', discount_type: 'fixed', value: 40000, min_spend: 350000, usage_limit: 200, times_used: 30 },
  { code: 'AUTUMN2026', discount_type: 'percent', value: 12, min_spend: 300000, usage_limit: 400, times_used: 15 },
  { code: 'SUPERDEAL', discount_type: 'fixed', value: 150000, min_spend: 1200000, usage_limit: 80, times_used: 21 },
  { code: 'WELCOMEBACK', discount_type: 'fixed', value: 35000, min_spend: 250000, usage_limit: 300, times_used: 64 },
  { code: 'GIAMSAU35', discount_type: 'percent', value: 35, min_spend: 1500000, usage_limit: 50, times_used: 19 },
  { code: 'HDSTORE50', discount_type: 'fixed', value: 50000, min_spend: 500000, usage_limit: 200, times_used: 47 },
  { code: 'TRIANVIP', discount_type: 'fixed', value: 120000, min_spend: 900000, usage_limit: 100, times_used: 33 },
  { code: 'SHOPPING10', discount_type: 'percent', value: 10, min_spend: 200000, usage_limit: 500, times_used: 92 },
  { code: 'LUCKYDAY', discount_type: 'fixed', value: 88000, min_spend: 688000, usage_limit: 88, times_used: 56 }
];

const SUPPLIERS = [
  'Công ty Cổ phần Dệt May ThoiTrangHD',
  'Xưởng May Thêu Xuất Khẩu Phong Phú',
  'Nhà Máy Sản Xuất Da Giày Hà Nội',
  'Tổng Công Ty Dệt May Việt Nam (Vinatex)',
  'Xí Nghiệp May Đồng Phục & Thời Trang Thái Bình',
  'Công Ty TNHH Phụ Kiện Thời Trang Á Châu'
];

async function expandAllForms() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Đã kết nối CSDL thoitranghd_db.');

    // ==========================================
    // 1. TĂNG SẢN PHẨM THEO TỪNG DANH MỤC (>= 35 SẢN PHẨM MỖI LOẠI)
    // ==========================================
    console.log('\n--- 1. Bổ sung sản phẩm cho từng danh mục ---');
    for (const p of EXTRA_PRODUCTS) {
      const [ex] = await connection.query('SELECT id FROM products WHERE name = ?', [p.name]);
      if (ex.length === 0) {
        // Sinh id mới
        const [maxIdRow] = await connection.query('SELECT MAX(CAST(id AS UNSIGNED)) as maxId FROM products WHERE id REGEXP "^[0-9]+$"');
        const nextId = String((maxIdRow[0]?.maxId || 100) + 1);
        const originalPrice = Math.round(p.price * 1.25 / 10000) * 10000;
        const discount = Math.round((1 - p.price / originalPrice) * 100);

        await connection.query(
          `INSERT INTO products (id, name, price, original_price, discount, category, image, description, features, stock, sold_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nextId,
            p.name,
            p.price,
            originalPrice,
            discount,
            p.category,
            p.image,
            p.desc,
            JSON.stringify(['Chất liệu chuẩn xuất khẩu', 'Bảo hành 1 đổi 1 trong 30 ngày', 'Giao hàng hỏa tốc']),
            Math.floor(Math.random() * 80) + 20,
            Math.floor(Math.random() * 200) + 10
          ]
        );
      }
    }
    const [catCounts] = await connection.query('SELECT category, COUNT(*) as cnt FROM products GROUP BY category');
    console.log('📊 Số lượng sản phẩm từng danh mục sau khi tăng:', catCounts);

    // ==========================================
    // 2. TĂNG KHÁCH HÀNG (USERS >= 45 USERS)
    // ==========================================
    console.log('\n--- 2. Bổ sung danh sách người dùng ---');
    for (const u of EXTRA_USERS) {
      const [ex] = await connection.query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (ex.length === 0) {
        await connection.query(
          `INSERT INTO users (name, email, password, phone, address, role)
           VALUES (?, ?, '123', ?, ?, 'user')`,
          [u.name, u.email, u.phone, u.address]
        );
      }
    }
    const [userCount] = await connection.query('SELECT COUNT(*) as cnt FROM users');
    console.log(`📊 Tổng số người dùng hệ thống: ${userCount[0].cnt} users.`);

    // ==========================================
    // 3. TĂNG MÃ GIẢM GIÁ (VOUCHERS >= 40 MÃ)
    // ==========================================
    console.log('\n--- 3. Bổ sung danh sách mã voucher ---');
    for (const v of EXTRA_VOUCHERS) {
      const [ex] = await connection.query('SELECT code FROM vouchers WHERE code = ?', [v.code]);
      if (ex.length === 0) {
        await connection.query(
          `INSERT INTO vouchers (code, discount_type, value, min_spend, usage_limit, times_used, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
          [v.code, v.discount_type, v.value, v.min_spend, v.usage_limit, v.times_used]
        );
      }
    }
    const [voucherCount] = await connection.query('SELECT COUNT(*) as cnt FROM vouchers');
    console.log(`📊 Tổng số voucher khuyến mãi: ${voucherCount[0].cnt} mã.`);

    // ==========================================
    // 4. TĂNG NHẬP KHO (STOCK IMPORTS >= 40 PHIẾU)
    // ==========================================
    console.log('\n--- 4. Bổ sung phiếu nhập kho tồn kho ---');
    const [prods] = await connection.query('SELECT id, name, price FROM products LIMIT 50');
    const [currImports] = await connection.query('SELECT COUNT(*) as cnt FROM stock_imports');
    const importsNeeded = Math.max(0, 42 - currImports[0].cnt);

    for (let i = 0; i < importsNeeded; i++) {
      const prod = prods[i % prods.length];
      const supplier = SUPPLIERS[i % SUPPLIERS.length];
      const batchCode = `LO-2026-T10-${100 + i}`;
      const qty = Math.floor(Math.random() * 150) + 50;
      const costPrice = Math.round((Number(prod.price) * 0.55) / 1000) * 1000;
      const size = ['S', 'M', 'L', 'XL', '2XL'][i % 5];
      const color = ['Đen', 'Trắng', 'Xám', 'Xanh navy', 'Be'][i % 5];
      const daysAgo = Math.floor(Math.random() * 25) + 1;

      await connection.query(
        `INSERT INTO stock_imports (product_id, product_name, supplier_name, batch_code, quantity, cost_price, qc_passed, note, imported_at, size, color)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?)`,
        [prod.id, prod.name, supplier, batchCode, qty, costPrice, 'Nhập lô hàng chính hãng xưởng kiểm tra đạt 100% tiêu chuẩn', daysAgo, size, color]
      );
    }
    const [finalImports] = await connection.query('SELECT COUNT(*) as cnt FROM stock_imports');
    console.log(`📊 Tổng số phiếu nhập kho: ${finalImports[0].cnt} phiếu.`);

    // ==========================================
    // 5. TĂNG YÊU CẦU ĐỔI TRẢ (RETURNS: MỖI MỤC >= 32 BẢN GHI)
    // ==========================================
    console.log('\n--- 5. Bổ sung yêu cầu đổi trả bảo hành (Returns) ---');
    // Tìm các đơn hàng chưa có return_status
    const [availableOrders] = await connection.query('SELECT id FROM orders WHERE return_status IS NULL LIMIT 200');
    const returnTargets = [
      { status: 'Requested', target: 35 },
      { status: 'Approved', target: 35 },
      { status: 'Rejected', target: 35 }
    ];

    const RETURN_REASONS = [
      'Sản phẩm bị chật, muốn đổi lên 1 size lớn hơn',
      'Muốn đổi sang màu sắc khác phù hợp sở thích hơn',
      'Được tặng nhưng không vừa dáng người, muốn đổi mẫu',
      'Sản phẩm có chỉ thừa nhỏ ở đường may viền',
      'Nhầm lẫn khi đặt size trên ứng dụng'
    ];

    let orderIdx = 0;
    for (const rt of returnTargets) {
      const [cntRow] = await connection.query('SELECT COUNT(*) as cnt FROM orders WHERE return_status = ?', [rt.status]);
      const current = cntRow[0].cnt;
      const needed = Math.max(0, rt.target - current);
      console.log(`Return status [${rt.status}]: Hiện có ${current}, cần thêm ${needed}`);

      for (let k = 0; k < needed; k++) {
        if (orderIdx >= availableOrders.length) break;
        const ordId = availableOrders[orderIdx++].id;
        const reason = RETURN_REASONS[k % RETURN_REASONS.length];
        const targetSize = ['M', 'L', 'XL', '2XL'][k % 4];
        const targetColor = ['Trắng', 'Đen', 'Xám', 'Xanh navy'][k % 4];
        const note = rt.status === 'Approved' ? 'Shop đã đồng ý đổi hàng, shipper sẽ giao hàng mới thu hồi hàng cũ' :
                     rt.status === 'Rejected' ? 'Sản phẩm đã cắt mác hoặc quá thời hạn quy định 7 ngày đổi trả' :
                     'Khách hàng vừa gửi yêu cầu đổi size';

        await connection.query(
          `UPDATE orders 
           SET return_status = ?, return_reason = ?, return_target_size = ?, return_target_color = ?, return_note = ?
           WHERE id = ?`,
          [rt.status, reason, targetSize, targetColor, note, ordId]
        );
      }
    }
    const [finalReturns] = await connection.query(`
      SELECT return_status, COUNT(*) as cnt FROM orders WHERE return_status IS NOT NULL GROUP BY return_status
    `);
    console.log('📊 Số lượng yêu cầu đổi trả sau khi cập nhật:', finalReturns);

    // ==========================================
    // 6. TĂNG ĐÁNH GIÁ SẢN PHẨM (REVIEWS >= 60 ĐÁNH GIÁ)
    // ==========================================
    console.log('\n--- 6. Bổ sung đánh giá sản phẩm (Reviews) ---');
    const [existingReviews] = await connection.query('SELECT COUNT(*) as cnt FROM reviews');
    const reviewsNeeded = Math.max(0, 65 - existingReviews[0].cnt);
    const [sampleProducts] = await connection.query('SELECT id, name FROM products LIMIT 30');
    const [allUsers] = await connection.query('SELECT id, name FROM users WHERE role = "user" LIMIT 30');

    const COMMENTS = [
      'Sản phẩm đẹp xuất sắc, chất vải sờ rất mịn tay, mặc vào mát mẻ tôn dáng lắm!',
      'Giao hàng cực kỳ nhanh chóng, đóng gói hộp carton cứng cáp sang trọng. Rất hài lòng!',
      'Chuẩn size như shop tư vấn trong bảng kích cỡ, màu sắc y hệt như hình chụp.',
      'Đường kim mũi chỉ may rất cẩn thận, không có chỉ thừa nào. Chắc chắn sẽ ủng hộ shop tiếp.',
      'Chất liệu cotton dày dặn, giặt máy không bị xù lông hay co rút. Đáng tiền!',
      'Áo mặc ôm vừa vặn, màu xám sang trọng dễ phối đồ đi làm lẫn đi chơi.',
      'Shop tư vấn nhiệt tình, đổi trả hỗ trợ rất nhanh nếu lỡ chọn nhầm size. 5 sao!'
    ];

    for (let r = 0; r < reviewsNeeded; r++) {
      const prod = sampleProducts[r % sampleProducts.length];
      const usr = allUsers[r % allUsers.length];
      const rating = Math.random() > 0.15 ? 5 : 4;
      const comment = COMMENTS[r % COMMENTS.length];
      const size = ['S', 'M', 'L', 'XL'][r % 4];
      const color = ['Đen', 'Trắng', 'Xám', 'Xanh navy'][r % 4];
      const daysAgo = Math.floor(Math.random() * 20) + 1;

      await connection.query(
        `INSERT INTO reviews (product_id, user_id, user_name, rating, comment, is_verified_purchase, size, color, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [prod.id, usr.id, usr.name, rating, comment, size, color, daysAgo]
      );
    }
    const [finalReviews] = await connection.query('SELECT COUNT(*) as cnt FROM reviews');
    console.log(`📊 Tổng số đánh giá sản phẩm: ${finalReviews[0].cnt} đánh giá.`);

    // ==========================================
    // 7. TĂNG SẢN PHẨM YÊU THÍCH (FAVORITES >= 35 MỤC CHO USER 1 & USER 2)
    // ==========================================
    console.log('\n--- 7. Bổ sung sản phẩm yêu thích (Favorites) ---');
    const testUserIds = [1, 2];
    for (const uid of testUserIds) {
      const [userFavs] = await connection.query('SELECT product_id FROM favorites WHERE user_id = ?', [uid]);
      const existingProdIds = new Set(userFavs.map(f => String(f.product_id)));
      
      const [prodsToFav] = await connection.query('SELECT id FROM products LIMIT 50');
      let added = 0;
      for (const p of prodsToFav) {
        if (!existingProdIds.has(String(p.id)) && existingProdIds.size + added < 35) {
          await connection.query(
            'INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, NOW())',
            [uid, p.id]
          );
          added++;
        }
      }
    }
    const [finalFavs] = await connection.query('SELECT user_id, COUNT(*) as cnt FROM favorites GROUP BY user_id');
    console.log('📊 Số sản phẩm yêu thích của người dùng test:', finalFavs);

    console.log('\n🎉 ========================================================');
    console.log('✅ HOÀN TẤT BỔ SUNG TOÀN DIỆN MỌI FORM/MỤC TRÊN ỨNG DỤNG!');
    console.log('========================================================\n');

  } catch (err) {
    console.error('❌ Lỗi khi mở rộng dữ liệu hệ thống:', err);
  } finally {
    if (connection) await connection.end();
  }
}

expandAllForms();
