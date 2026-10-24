# HƯỚNG DẪN IMPORT CƠ SỞ DỮ LIỆU THỜI TRANG HD (MySQL)

Hệ thống sử dụng cơ sở dữ liệu **MySQL / MariaDB** (chạy tốt trên XAMPP, Laragon, WampServer hoặc Docker).

---

## 1. Thông Tin Kết Nối Mặc Định
* **Host**: `localhost` (hoặc `127.0.0.1`)
* **Port**: `3306`
* **User**: `root`
* **Password**: *(để trống)*
* **Tên Database**: `thoitranghd_db`
* **Bộ mã (Collation)**: `utf8mb4_unicode_ci`

---

## 2. Cách Import Qua Giao Diện phpMyAdmin (XAMPP / Laragon)
1. Mở XAMPP Control Panel và nhấn **Start** cho cả **Apache** và **MySQL**.
2. Truy cập trình duyệt vào địa chỉ: `http://localhost/phpmyadmin`
3. Nhấp vào tab **Mới (New)** ở cột bên trái:
   * Nhập tên cơ sở dữ liệu: `thoitranghd_db`
   * Bảng mã chọn: `utf8mb4_unicode_ci`
   * Nhấn nút **Tạo (Create)**.
4. Chọn cơ sở dữ liệu `thoitranghd_db` vừa tạo.
5. Nhấp vào tab **Nhập (Import)** ở menu trên cùng.
6. Nhấp vào nút **Chọn tệp (Choose File)** và chọn tệp `thoitranghd_db.sql` trong thư mục này.
7. Cuộn xuống cuối trang và nhấn **Thực hiện (Go / Import)**.
8. Chờ vài giây để hệ thống nạp toàn bộ cấu trúc bảng và dữ liệu mẫu đầy đủ.

---

## 3. Cách Import Qua Terminal / Command Prompt (Nhanh nhất)
Mở PowerShell hoặc CMD và chạy 2 lệnh sau:

```bash
# 1. Tạo database nếu chưa có
mysql -u root -e "CREATE DATABASE IF NOT EXISTS thoitranghd_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import file sql vào database
mysql -u root thoitranghd_db < thoitranghd_db.sql
```

*(Hoặc sử dụng đường dẫn XAMPP: `C:\xampp\mysql\bin\mysql.exe -u root thoitranghd_db < thoitranghd_db.sql`)*

---

## 4. Các Bảng Chính Trong Database
* `users`: Tài khoản khách hàng & quản trị viên (Admin).
* `products`: Thông tin sản phẩm thời trang, giá niêm yết, danh mục, hình ảnh, mô tả.
* `product_variants`: Ma trận phân loại Size và Màu sắc cùng số lượng tồn kho từng loại.
* `orders` & `order_items`: Đơn hàng, địa chỉ giao nhận, chi tiết sản phẩm và tổng tiền.
* `import_receipts` & `import_receipt_items`: Lịch sử phiếu nhập kho hàng hóa.
* `vouchers`: Mã giảm giá (% hoặc số tiền), điều kiện đơn tối thiểu và hạn dùng.
* `returns`: Danh sách yêu cầu khiếu nại đổi trả sản phẩm kèm hình ảnh & lý do.
* `favorites`: Danh sách sản phẩm yêu thích của người dùng.
* `reviews`: Đánh giá, số sao và bình luận của khách hàng đã mua sản phẩm.
* `cart_items`: Giỏ hàng lưu trữ theo tài khoản người dùng.
