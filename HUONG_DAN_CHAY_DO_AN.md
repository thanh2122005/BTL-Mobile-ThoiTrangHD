# BÁO CÁO VÀ SẢN PHẨM ĐỒ ÁN: HỆ THỐNG THỜI TRANG HD
> **Ứng dụng Mobile & Web E-Commerce Đa Nền Tảng (React Native / Expo + Node.js Express + MySQL)**  
> **Sinh viên thực hiện**: Bùi Duy Thành - **Mã sinh viên**: 12523080

---

## 📁 CẤU TRÚC THƯ MỤC NỘP BÀI

Gói sản phẩm bao gồm các phần chính:

```text
📦 ThoiTrangHD/
 ├── 📂 database/
 │    ├── thoitranghd_db.sql             # Toàn bộ cấu trúc bảng và dữ liệu mẫu MySQL
 │    └── HUONG_DAN_CAI_DAT_CSDL.md       # Hướng dẫn chi tiết cách Import database
 ├── 📂 backend/
 │    ├── server.js                      # API Server RESTful (Port 5000)
 │    ├── chatbotService.js              # Trợ lý ảo tư vấn thông minh
 │    ├── package.json                   # Danh sách thư viện phụ thuộc của Backend
 │    └── uploads/                       # Thư mục lưu trữ hình ảnh sản phẩm & đánh giá
 ├── 📂 app/                             # Cấu trúc màn hình Expo Router
 │    ├── (tabs)/                        # Trang chủ, Danh mục, Khám phá, Giỏ hàng, Tài khoản
 │    ├── admin.tsx                      # Hệ thống quản trị viên (Admin Dashboard)
 │    ├── product/[id].tsx               # Chi tiết sản phẩm & Gợi ý size
 │    └── ...                            # Màn hình thanh toán, đơn mua, đổi trả, tra cứu đơn...
 ├── 📂 components/                         # Các component UI tái sử dụng
 ├── 📂 contexts/                           # AuthContext, CartContext (quản lý state toàn cục)
 ├── 📂 constants/                          # Cấu hình màu sắc, icon, kích thước
 ├── 📂 TàiLiệu/                            # Thư mục tài liệu báo cáo Word (.docx)
 └── 📄 HUONG_DAN_CHAY_DO_AN.md            # Tài liệu hướng dẫn cài đặt & khởi chạy đồ án
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY SẢN PHẨM

### Bước 1: Khởi động Cơ sở dữ liệu MySQL
1. Mở **XAMPP Control Panel** (hoặc Laragon) -> Bấm **Start** cả 2 dịch vụ **Apache** và **MySQL**.
2. Mở trình duyệt vào `http://localhost/phpmyadmin`.
3. Tạo cơ sở dữ liệu mới tên là: `thoitranghd_db` (bảng mã `utf8mb4_unicode_ci`).
4. Nhấn **Import** và chọn tệp `database/thoitranghd_db.sql` -> Nhấn **Go** để nạp dữ liệu.

---

### Bước 2: Khởi chạy Backend Server (Node.js)
1. Mở cửa sổ Terminal / PowerShell tại thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Khởi động server backend:
   ```bash
   node server.js
   ```
   *Server sẽ chạy tại địa chỉ: `http://localhost:5000`*.

---

### Bước 3: Khởi chạy Frontend (Expo React Native)
1. Mở cửa sổ Terminal / PowerShell tại thư mục gốc của dự án:
   ```bash
   npm install
   ```
2. Khởi động ứng dụng Expo:
   ```bash
   npx expo start
   ```
3. **Cách trải nghiệm**:
   * **Trên Trình duyệt Web (khuyên dùng khi chấm bài)**: Bấm phím `w` trên bàn phím để mở trực tiếp trên trình duyệt Web (`http://localhost:8081`).
   * **Trên Điện thoại thật**: Cài app **Expo Go** trên App Store (iOS) hoặc CH Play (Android), sau đó dùng camera quét mã QR hiển thị trên màn hình terminal.

---

## 🔑 TÀI KHOẢN TRẢI NGHIỆM ĐÃ TẠO SẴN

| Vai trò | Số điện thoại | Mật khẩu | Chức năng nổi bật |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `0988888888` | `123456` | Quản lý sản phẩm, đơn hàng, nhập kho, duyệt đổi trả, voucher, báo cáo tài chính chuyên sâu |
| **Khách hàng VIP** | `0901234567` | `123456` | Đặt hàng, áp voucher, tra cứu đơn, tích điểm VIP, đánh giá sản phẩm |
| **Khách hàng mới** | `0912345678` | `123456` | Đăng ký tài khoản, xem sản phẩm, thử tính năng tư vấn Size thông minh |

*Lưu ý: Để vào trang Quản trị nhanh trên Web, truy cập trực tiếp: `http://localhost:8081/admin`.*
