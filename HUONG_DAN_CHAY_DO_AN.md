# BÁO CÁO VÀ SẢN PHẨM ĐỒ ÁN: HỆ THỐNG THỜI TRANG HD
> **Ứng dụng Mobile & Web E-Commerce Đa Nền Tảng (React Native / Expo + Node.js Express + MySQL)**  
> **Sinh viên thực hiện**: Bùi Duy Thành - **Mã sinh viên**: 12523080  
> **Giảng viên hướng dẫn**: ThS. Vũ Xuân Thắng

---

## 📁 CẤU TRÚC THƯ MỤC NỘP BÀI

Gói sản phẩm được phân chia khoa học thành 3 thư mục độc lập theo yêu cầu:

```text
📦 BuiDuyThanh-12523080_SanPham.zip
 ├── 📂 1. Frontend/                    # Ứng dụng Mobile & Web đa nền tảng (React Native / Expo SDK 54)
 │    ├── app/                          # Toàn bộ màn hình Expo Router (Admin, Home, Products, Cart...)
 │    ├── components/                   # UI components, ChatbotWidget, VoucherModal...
 │    ├── constants/                    # vietnamLocations, images, config API...
 │    ├── contexts/                     # AuthContext, CartContext
 │    ├── assets/                       # Ảnh tĩnh, icon ứng dụng
 │    └── package.json                  # Cấu hình dependencies Frontend
 ├── 📂 2. Backend/                     # API Server Node.js / Express
 │    ├── server.js                     # RESTful API Server (Port 5000)
 │    ├── chatbotService.js             # Trợ lý AI Stylist tư vấn chọn size & phối đồ
 │    ├── uploads/                      # Lưu trữ hình ảnh sản phẩm & đánh giá tải lên
 │    └── package.json                  # Cấu hình dependencies Backend
 ├── 📂 3. CoSoDuLieu/                  # Cơ sở dữ liệu MySQL
 │    ├── thoitranghd_db.sql            # File dump toàn bộ bảng & dữ liệu mẫu (101 Test Cases)
 │    └── HUONG_DAN_CAI_DAT_CSDL.md      # Hướng dẫn chi tiết cách Import database
 └── 📄 HUONG_DAN_CHAY_DO_AN.md         # Hướng dẫn chi tiết cài đặt và khởi chạy hệ thống
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### Bước 1: Khởi động Cơ sở dữ liệu MySQL
1. Mở **XAMPP Control Panel** (hoặc Laragon) -> Bấm **Start** cả 2 dịch vụ **Apache** và **MySQL**.
2. Mở trình duyệt vào: `http://localhost/phpmyadmin`.
3. Tạo cơ sở dữ liệu mới với tên: `thoitranghd_db` (Bảng mã: `utf8mb4_unicode_ci`).
4. Bấm tab **Import** -> Chọn file `3. CoSoDuLieu/thoitranghd_db.sql` -> Bấm **Import (Go)** ở cuối trang để nạp dữ liệu.

---

### Bước 2: Khởi chạy Backend Server (Node.js)
1. Mở Terminal / PowerShell tại thư mục `2. Backend`:
   ```bash
   cd "2. Backend"
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi động server:
   ```bash
   node server.js
   ```
   *Server sẽ chạy tại địa chỉ: `http://localhost:5000`*.

---

### Bước 3: Khởi chạy Frontend (Expo React Native)
1. Mở một cửa sổ Terminal / PowerShell mới tại thư mục `1. Frontend`:
   ```bash
   cd "1. Frontend"
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng Expo:
   ```bash
   npx expo start
   ```
4. **Cách trải nghiệm hệ thống**:
   * **Trải nghiệm trên Web (khuyên dùng khi chấm bài)**: Bấm phím `w` trên bàn phím terminal để mở trực tiếp trên trình duyệt Web (`http://localhost:8081`).
   * **Trải nghiệm trên Điện thoại**: Cài ứng dụng **Expo Go** từ App Store (iOS) hoặc Google Play (Android), mở camera quét mã QR hiển thị trên màn hình terminal.

---

## 🔑 TÀI KHOẢN TRẢI NGHIỆM ĐÃ TẠO SẴN

| Vai trò | Số điện thoại | Mật khẩu | Chức năng nổi bật |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `0988888888` | `123456` | Quản lý sản phẩm, ma trận tồn kho Size × Màu, đơn hàng, nhập kho & QC, duyệt đổi trả, voucher, báo cáo tài chính |
| **Khách hàng VIP** | `0901234567` | `123456` | Đặt hàng, áp voucher, thanh toán VietQR, tra cứu đơn hàng, hủy đơn hoàn kho, đánh giá sản phẩm |
| **Khách hàng mới** | `0912345678` | `123456` | Đăng ký tài khoản, xem danh mục thời trang, trải nghiệm Trợ lý AI Stylist thông minh |

*Lưu ý: Để vào thẳng trang Quản trị viên trên Web: truy cập đường dẫn `http://localhost:8081/admin`.*
