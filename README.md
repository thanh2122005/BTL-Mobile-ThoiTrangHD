# 🛍️ THOITRANGHD - HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ THỜI TRANG ĐA NỀN TẢNG (MOBILE & WEB)

> **Đề tài Bài tập lớn / Đồ án tốt nghiệp:** Ứng dụng & Website Thương Mại Điện Tử Thời Trang Cao Cấp HD  
> **Repository GitHub:** [https://github.com/thanh2122005/BTL-Mobile-ThoiTrangHD](https://github.com/thanh2122005/BTL-Mobile-ThoiTrangHD)

---

## 🔑 1. TÀI KHOẢN ĐĂNG NHẬP HỆ THỐNG (SYSTEM CREDENTIALS)

### 👑 Tài khoản Quản trị viên (Admin Dashboard)
* **Email:** `admin@thoitranghd.com`
* **Mật khẩu:** `admin123`
* **Đường dẫn trang Admin:** `http://localhost:8081/admin`
* **Quyền hạn quản trị:**
  * 📊 **Dashboard & Analytics:** Thống kê tổng doanh thu, doanh thu hôm nay, biểu đồ doanh thu 7 ngày gần nhất, phân bổ đơn hàng.
  * 📦 **Quản lý Sản phẩm & Nhập kho (Inbound QC):** Thêm/sửa/xóa sản phẩm, upload ảnh server, lập phiếu nhập kho theo Lô sản xuất (`Batch No`), kiểm định QC xuất xưởng 100 cái như 100.
  * 🚚 **Điều phối Đơn hàng & Đổi trả:** Duyệt đơn giao (`Pending` ➔ `Processing` ➔ `Completed` ➔ `Cancelled`), tiếp nhận cảnh báo đổi trả `🔄 ĐỔI TRẢ` từ khách hàng.
  * 👥 **Quản lý Khách hàng & Phân hạng VIP:** Xem danh sách khách, chi tiêu tích lũy, tự động xếp hạng VIP Vàng / VIP Kim Cương.
  * 🎟️ **Quản lý Voucher Khuyến mại:** Tạo mã giảm giá theo % hoặc số tiền cố định, phân quyền voucher theo hạng VIP (`min_vip_level`).

---

### 👤 Tài khoản Khách hàng Mẫu (Customer Accounts)
| Họ và tên | Email | Mật khẩu | Hạng thành viên |
| :--- | :--- | :--- | :--- |
| **Nguyễn Văn A** | `nguyenvana@gmail.com` | `123456` | Khách hàng VIP |
| **Trần Thị B** | `tranthib@gmail.com` | `123456` | Khách hàng Thường |
| **Lê Văn C** | `levanc@gmail.com` | `123456` | Khách hàng Thường |

---

## 🚀 2. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY (QUICK START)

### Bước 1: Khởi động Cơ sở dữ liệu MySQL
* Khởi động dịch vụ **XAMPP / MySQL** trên máy tính (cổng mặc định `3306`).
* Tên database: `thoitranghd_db` (Hệ thống tự động tạo bảng và nạp dữ liệu mẫu khi khởi động).

### Bước 2: Khởi động Backend API (Node.js & Express)
Mở một cửa sổ Terminal tại thư mục dự án và chạy:
```bash
npm run backend
```
* Backend RESTful API sẽ chạy tại: `http://localhost:5000`

### Bước 3: Khởi động Frontend (React Native Expo Web / Mobile)
Mở một cửa sổ Terminal thứ hai và chạy:
```bash
npm run web
```
* Giao diện Web sẽ chạy tại: `http://localhost:8081`
* Nếu muốn chạy trên điện thoại qua ứng dụng **Expo Go**, quét mã QR hiển thị trong terminal.

---

## 🎯 3. ĐẶC TRƯNG NGHIỆP VỤ NỔI BẬT (BUSINESS LOGIC)

1. **Đặc thù Thời trang Công nghiệp ("100 cái như 100"):**
   * Quản lý ma trận biến thể: Quần áo `[S, M, L, XL]`, Giày dép `[35 - 43]`, Phụ kiện `[Freesize]`, Đa dạng màu sắc.
   * **Smart Size Calculator:** Công cụ tự động tính toán và gợi ý size chuẩn xác dựa trên Chiều cao & Cân nặng của khách.
   * Cam kết chất lượng vải dệt không bai dão, không xù lông sau giặt.

2. **Quy trình Nhập hàng vào kho (Inbound QC):**
   * Quản lý phiếu nhập kho theo Lô sản xuất (`Batch No`) từ các xưởng may / công ty dệt may đối tác.
   * Quy trình kiểm định chất lượng xác suất 5-10% (QC checklist) trước khi cộng dồn vào tồn kho (`stock`).

3. **Thuật toán Trưng bày & Tiếp thị Trang chủ:**
   * **Sản phẩm nổi bật:** Sắp xếp theo thuật toán ưu tiên số lượng đã bán (`sold_count` DESC), tiếp theo đến mức giảm giá (`discount` DESC).
   * **Hàng mới về:** Sắp xếp theo thời gian nhập kho (`created_at` DESC).

4. **Giỏ hàng & Thanh toán Chọn lọc (Selective Checkout):**
   * Cho phép khách hàng tích chọn từng món cần mua trong giỏ.
   * Thanh tiến trình Miễn phí vận chuyển (Freeship Bar) cho đơn hàng từ 300.000đ trở lên.
   * Giao diện thanh toán 2 cột sang trọng, nhập sổ địa chỉ & ghi chú shipper.

5. **Quy trình Đổi trả & Bảo hành 7 ngày (Sau bán hàng):**
   * Khuyến nghị quay Video mở hộp (Unboxing) làm căn cứ đối soát minh bạch.
   * Khách có nút **Yêu cầu Đổi trả / Bảo hành** trực tiếp trên đơn hàng đã giao (`Completed`) với đầy đủ 4 lý do (đổi size, đổi màu, lỗi đường may/khóa, giao sai mẫu).
   * Phân định trách nhiệm cước phí rõ ràng: Lỗi shop chịu 100% ship 2 chiều; Khách đổi size chịu phí ship.

6. **Hệ thống Khách hàng Thân thiết (VIP Loyalty System):**
   * Tự động tích lũy chi tiêu: Dưới 500k (Thường) ➔ Từ 500k (VIP Vàng) ➔ Từ 2.000.000đ (VIP Kim Cương).
   * Voucher phân tầng theo cấp độ VIP (`min_vip_level`).

7. **Đánh giá & Review Minh bạch:**
   * Gắn huy hiệu **"Đã mua hàng" (Verified Purchase)** khi đánh giá đơn đã hoàn thành.
   * Hiển thị chính xác Size và Màu sắc người mua đã chọn để người sau dễ dàng tham khảo.

---

## 🛠️ 4. CÔNG NGHỆ ÁP DỤNG (TECH STACK)

* **Frontend:** React Native (0.81.5), Expo SDK 54, Expo Router, TypeScript.
* **Backend:** Node.js, Express 5, Multer (quản lý lưu trữ ảnh tĩnh nội bộ `/uploads`), CORS.
* **Database:** MySQL (mysql2 promise pool) hỗ trợ Transaction an toàn dữ liệu.
