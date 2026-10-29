# SGUET · Website tra cứu kết quả vòng đơn

Website Google Apps Script tra cứu bằng **SBD và họ tên**, lấy kết quả trực tiếp từ Google Sheets riêng tư. Người tra cứu không cần đăng nhập Google. Không dùng API key và không tải toàn bộ danh sách ứng viên về trình duyệt.

## Mã nguồn

| Tệp | Chức năng |
| --- | --- |
| [Code.gs](Code.gs) | Đọc Sheets, đối chiếu thông tin, tách các ban đậu, giới hạn tần suất và chẩn đoán cấu hình. |
| [Index.html](Index.html) | Giao diện HTML/CSS/JavaScript và lời gọi server bằng `google.script.run`. |
| [tests/server.test.cjs](tests/server.test.cjs) | Kiểm thử logic server bằng mock dịch vụ Google. |
| [tests/frontend.test.cjs](tests/frontend.test.cjs) | Kiểm thử trạng thái giao diện bằng mock DOM và RPC. |

Chỉ chép `Code.gs` và `Index.html` lên Apps Script. Dữ liệu giả trong bộ kiểm thử không được dùng trong bản triển khai.

## Giao diện hiện tại

- Font **Nunito**, nền trắng, màu đen và xanh dương nhạt.
- Hai ô SBD và Họ và tên có viền đen bo tròn; nút tìm kiếm tròn màu đen với kính lúp trắng.
- Màn hình máy tính đặt các ô trên một hàng; điện thoại xếp dọc và giữ nút tìm kiếm tròn.
- Ban đầu hiển thị **SGUET TRA CỨU KẾT QUẢ VÒNG ĐƠN**, chưa có lời chúc mừng.
- Khi có ban đậu, tiêu đề chuyển thành **SGUET CHÚC MỪNG BẠN ĐÃ ĐỖ VÒNG ĐƠN!**.
- Phần kết quả căn giữa, chữ xanh nhạt đậm nghiêng, không có nền hoặc viền khung ngoài. Danh sách đầy đủ các ban xuống dòng riêng:

  > Bạn đã đậu kết quả vòng đơn của
  >
  > Ban Truyền thông, Ban Tổ chức sự kiện.

- Bên dưới là lời nhắc chữ đỏ nghiêng trong khung đỏ bo tròn:

  > Bạn hãy xác nhận và hãy nhớ **BẠN CHỈ ĐƯỢC PHÉP** tham gia phỏng vấn Ban mà bạn đã đậu vòng đơn.

Khung này chỉ là lời nhắc, không phải nút xác nhận và không ghi nhận tham gia phỏng vấn vào Sheets. Nếu cột Đậu trống, website thông báo chưa vượt qua vòng đơn, không chúc mừng và không hiển thị khung nhắc.

## 1. Chuẩn bị Google Sheets

### Bảng dữ liệu

Hàng 1 có bốn tiêu đề theo đúng thứ tự; dữ liệu bắt đầu từ hàng 2:

| Cột | Tiêu đề | Nội dung |
| --- | --- | --- |
| A | SBD | Mã ứng viên, lưu dưới dạng văn bản. |
| B | Họ và tên | Họ tên đầy đủ, có dấu. |
| C | Điền đơn | Các ban ứng viên đăng ký; không dùng để xác định kết quả. |
| D | Đậu | Các ban ứng viên vượt qua vòng đơn. |

Không gộp ô tiêu đề. Mã chấp nhận khác biệt hoa/thường, Unicode và khoảng trắng thừa trong tiêu đề, nhưng không tự hoán đổi thứ tự cột.

Trước khi nhập/import SBD, chọn cột A → **Định dạng → Số → Văn bản thuần túy**. Hỗ trợ mã như `X04`, `00123`; SBD có 1–30 chữ cái ASCII hoặc chữ số. Nếu Sheets đã xóa số 0 đầu, định dạng lại không khôi phục được: cần sửa từ dữ liệu nguồn.

Cột C và D dùng dropdown nhiều lựa chọn, kiểu chip, với ba mục:

- Ban Tư vấn - Hỗ trợ
- Ban Truyền thông
- Ban Tổ chức sự kiện

Server đọc chuỗi hiển thị bằng `getDisplayValues()` và tách đầy đủ các mục phân cách bằng dấu phẩy, chấm phẩy hoặc xuống dòng; loại mục trùng và giữ thứ tự. Hoa/thường, Unicode và khoảng trắng thừa trong tên ban được chuẩn hóa. Tên ban ngoài ba lựa chọn sẽ gây lỗi để tránh trả kết quả thiếu hoặc sai.

**Chỉ cột D quyết định kết quả.** Để D trống nếu chưa vượt qua vòng đơn; không nhập `Không`, `Chưa đậu` hoặc dấu gạch thay ô trống. Mỗi SBD nên duy nhất; nếu nhiều dòng trùng cả SBD và họ tên sau chuẩn hóa, server từ chối trả kết quả.

### Giữ bảng tính riêng tư

Trong **Chia sẻ**, giữ **Quyền truy cập chung → Bị hạn chế**. Không bật **Xuất bản lên web**. Chỉ cấp quyền chỉnh sửa cho người quản lý cần thiết. Tài khoản triển khai Web App phải có quyền đọc bảng tính.

## 2. Cấu hình Apps Script

1. Từ Sheets, mở **Tiện ích mở rộng → Apps Script**.
2. Dán toàn bộ nội dung [Code.gs](Code.gs) vào tệp `Code.gs`.
3. Tạo tệp **HTML** tên **Index** và dán [Index.html](Index.html). Nếu đã có, thay nội dung tệp hiện tại.
4. Mở **Cài đặt dự án → Thuộc tính tập lệnh → Thêm thuộc tính tập lệnh**:

   | Tên thuộc tính | Giá trị |
   | --- | --- |
   | SPREADSHEET_ID | ID bảng tính, là đoạn giữa `/d/` và `/edit` trong URL Sheets. Không nhập toàn bộ URL. |

5. Kiểm tra `CONFIG.sheetName` trong `Code.gs`:

   ```javascript
   sheetName: 'Danh sách Đậu Vòng đơn',
   ```

   **Đây phải là tên tab chứa dữ liệu ở thanh dưới cùng Google Sheets, không phải tên tài liệu ở góc trên trái.** Giá trị trong repo chỉ là cấu hình mặc định; thay bằng tên tab thực tế, đúng dấu, chữ hoa/thường và khoảng trắng. Ví dụ, nếu tab là `Trang tính1`:

   ```javascript
   sheetName: 'Trang tính1',
   ```

6. Nhấn **Ctrl + S** để lưu. Không đưa ID hoặc thông tin xác thực vào HTML.

## 3. Kiểm tra cấu hình trước khi triển khai

Bản `Code.gs` trong repo có sẵn hàm **`diagnoseSetup_`**; đây là hàm của dự án, không phải công cụ mặc định của Google.

1. Lưu mã mới trong trình soạn thảo Apps Script.
2. Trên thanh công cụ, mở danh sách hàm cạnh nút **▶ Chạy** và chọn **`diagnoseSetup_`**.
