3. Bấm **Chạy**, không bấm **Gỡ lỗi**. Cấp quyền nếu được yêu cầu.
4. Mở **Nhật ký thực thi** và tìm dòng `SGUET_SETUP:...`.

Nếu không thấy hàm, kiểm tra đã chép toàn bộ `Code.gs` mới và lưu. Khung **Trình gỡ lỗi** báo chưa có điểm dừng không phải kết quả kiểm tra cấu hình; đóng khung đó và dùng nút **Chạy**.

Hàm chẩn đoán chỉ đọc bảng, kiểm tra tiêu đề và mọi ô D; không sửa dữ liệu, không dùng quota tra cứu công khai và không log thông tin ứng viên. Dấu `_` cuối tên ngăn gọi hàm từ `google.script.run`.

| Mã sau `SGUET_SETUP:` | Ý nghĩa và cách xử lý |
| --- | --- |
| OK | Đọc được bảng, đúng cấu trúc A:D và các ô D có tên ban hợp lệ. Tiếp tục kiểm tra Web App. |
| MISSING_SPREADSHEET_ID | Thêm thuộc tính tập lệnh tên chính xác `SPREADSHEET_ID`. |
| SHEET_ACCESS_FAILED | Kiểm tra ID và quyền đọc của tài khoản chạy. Mã này không xác định riêng lỗi quyền hay lỗi ID/dịch vụ. |
| SHEET_NOT_FOUND | Sửa `CONFIG.sheetName` thành tên tab ở cuối Sheets. Tên tài liệu không thay thế tên tab. |
| INVALID_HEADERS | Kiểm tra hàng 1 theo thứ tự SBD, Họ và tên, Điền đơn, Đậu; không gộp ô. |
| INVALID_ROW_COUNT | Thiếu hàng tiêu đề hoặc vượt 50.000 dòng dữ liệu. |
| SHEET_READ_FAILED | Không đọc được A:D; kiểm tra cấu trúc bảng, dịch vụ Sheets và hạn mức tài khoản. |
| INVALID_DEPARTMENT | Một ô D chứa mục ngoài ba tên ban cho phép. Kiểm tra dropdown, không dùng chữ “Không” thay ô trống. |
| UNEXPECTED_ERROR | Kiểm tra trạng thái thực thi và hạn mức Apps Script. Không cần gửi lỗi thô chứa thông tin riêng tư. |

Nếu đang dùng hàm kiểm tra cũ và thấy **`SAI_TEN_TAB`**, lỗi tương ứng với **`SHEET_NOT_FOUND`**: đổi `CONFIG.sheetName` hoặc đổi tên tab để chúng khớp nhau.

Nếu website báo **“Chưa thể tra cứu lúc này…”**, yêu cầu đã gặp lỗi server, khác với không tìm thấy thông tin. Log của lần gọi `lookup` có tiền tố `SGUET_LOOKUP:`. Mã `DUPLICATE_IDENTITY` nghĩa là nhiều dòng trùng cả SBD và họ tên. Chẩn đoán toàn bảng có thể phát hiện ô D lỗi ở dòng khác, trong khi tra cứu chỉ kiểm tra D của người khớp. Khi cần hỗ trợ, chỉ gửi mã lỗi; không gửi danh sách ứng viên.

## 4. Triển khai và cập nhật Web App

### Triển khai lần đầu

1. Chọn **Triển khai → Triển khai mới → Ứng dụng web**.
2. Chọn **Thực thi dưới danh nghĩa: Tôi**, bằng tài khoản có quyền đọc bảng tính.
3. Chọn **Ai có quyền truy cập: Bất kỳ ai / Anyone** để tra cứu không cần đăng nhập Google.
4. Triển khai, cấp quyền bằng tài khoản quản lý sau khi kiểm tra mã.
5. Mở URL kết thúc bằng **`/exec`** trong cửa sổ ẩn danh chưa đăng nhập để kiểm tra.

Nếu Workspace không cung cấp tùy chọn “Bất kỳ ai”, cần quản trị viên cho phép hoặc dùng tài khoản được tổ chức chấp thuận. Không công khai Sheets để khắc phục. URL `/dev` dành cho người có quyền chỉnh sửa, không dùng thay URL công khai.

### Cập nhật website đã có

Sau khi sửa `Code.gs` hoặc `Index.html`:

1. Lưu mã trong Apps Script.
2. Chọn **Triển khai → Quản lý các bản triển khai**.
3. Chọn bản triển khai hiện tại → **Chỉnh sửa**.
4. Chọn **Phiên bản mới → Triển khai**.
5. Tải lại URL `/exec` và kiểm tra.

Chỉ bấm Lưu trong trình soạn thảo không cập nhật mã của bản `/exec` đang triển khai. Cập nhật bản triển khai hiện tại giữ nguyên URL.

Khi chỉ thay đổi dữ liệu Sheets, **không cần triển khai lại**: server dùng `SpreadsheetApp.openById()` đọc mới vùng A:D mỗi yêu cầu, không cache danh sách hay kết quả. HTML phải chạy qua Apps Script để sử dụng `google.script.run`, không chạy như trang tĩnh độc lập.

## 5. Quy tắc tra cứu và trạng thái hiển thị

- Bắt buộc có cả SBD và họ tên; server kiểm tra lại dữ liệu gửi lên.
- SBD được bỏ khoảng trắng đầu/cuối và so khớp không phân biệt hoa/thường; giữ nguyên số 0 đầu. Khoảng trắng giữa mã không hợp lệ.
- Họ tên được chuẩn hóa Unicode NFC, bỏ khoảng trắng đầu/cuối và gộp khoảng trắng thừa; không phân biệt hoa/thường. Vẫn phân biệt dấu tiếng Việt, không tìm kiếm một phần hoặc sửa chính tả.
- SBD và họ tên phải khớp cùng một dòng. Server chỉ trả trạng thái và danh sách ban đậu của dòng đó; không trả SBD, họ tên, cột C hoặc các ứng viên khác.

| Trường hợp | Hiển thị |
| --- | --- |
| Đang gửi yêu cầu | Thông báo đang tra cứu, tạm vô hiệu hóa nút gửi. |
| Không khớp | “Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra lại SBD và họ tên.” |
| Khớp, D có một/nhiều ban | Lời chúc mừng, đầy đủ các ban đậu và khung nhắc phỏng vấn. |
| Khớp, D trống | “Bạn chưa vượt qua vòng đơn. Cảm ơn bạn đã quan tâm và tham gia cùng SGUET.” |
| Lỗi server | Thông báo chưa thể tra cứu; xem mã an toàn trong log server. |
| Lỗi kết nối | Thông báo kết nối gặp sự cố và cho phép thử lại. |
| Hết quota | Thông báo hệ thống đạt giới hạn tra cứu. |

Khi nhập thông tin khác hoặc bắt đầu yêu cầu mới, kết quả cũ bị ẩn. Phản hồi cho dữ liệu đã thay đổi trong lúc chờ bị bỏ qua. Nội dung động được hiển thị bằng `textContent`/text node, không chèn HTML từ ô Sheets.

## 6. Kiểm thử

Không cần cài dependencies. Từ thư mục repo, dùng Node.js chạy:

```sh
node tests/server.test.cjs
node tests/frontend.test.cjs
```

Bộ kiểm thử hiện có **10 ca server và 4 ca frontend**, dùng mock dịch vụ Google/DOM. Chúng kiểm tra đối chiếu cùng dòng, dấu tiếng Việt, số 0 đầu, nhiều ban, D trống, dữ liệu thay đổi, quota, chẩn đoán cấu hình và điều kiện hiển thị chúc mừng. Không thay thế kiểm tra tích hợp bằng Google Sheets thật hoặc đánh giá hiển thị trong trình duyệt.

Trước khi sử dụng chính thức, kiểm tra với bảng thử riêng:

1. D chọn một ban, rồi hai/ba chip: website hiển thị đầy đủ từng ban, danh sách xuống dòng riêng.
2. C có nhiều ban nhưng D trống: không chúc mừng, không xuất hiện khung nhắc.
3. Đúng SBD nhưng sai tên, sai dấu hoặc tên thuộc dòng khác: không tìm thấy.
4. Thay đổi hoa/thường, khoảng trắng thừa; thử mã chữ/số và số 0 đầu: vẫn đối chiếu đúng quy tắc.
5. Sửa D, đợi ít nhất 5 giây và tra cứu lại: thấy dữ liệu mới mà không cập nhật bản triển khai.
6. Thử máy tính, điện thoại, Tab/Enter và cửa sổ ẩn danh; kiểm tra đang tải, không tìm thấy, lỗi kết nối và việc ẩn kết quả cũ.

Không kiểm thử tải lớn trên dữ liệu ứng viên thật.

## 7. Bảo vệ dữ liệu và giới hạn chống tra cứu hàng loạt

- Server giới hạn **chung toàn ứng dụng** ở 60 yêu cầu/phút và 1.000/ngày UTC, cấu hình trong `CONFIG`. Tính cả yêu cầu sai. Bộ đếm `LOOKUP_QUOTA` lưu trong Script Properties và cập nhật dưới `ScriptLock`, không chứa SBD/họ tên.
- Hết quota hoặc không lấy được khóa thì từ chối trước khi đọc danh sách ứng viên. Apps Script còn có hạn mức nền tảng riêng.
- Frontend chờ 5 giây giữa các lần gửi, chặn gửi đồng thời và có honeypot. Các lớp frontend có thể bị bỏ qua; server vẫn kiểm tra dữ liệu và quota.
- Apps Script RPC công khai không có IP khách đáng tin cậy. Giới hạn chung không phải giới hạn từng người và không bảo đảm ngăn bot. Người xấu có thể dùng hết quota, khiến người khác bị từ chối; quota không ngăn hoàn toàn việc cạn tài nguyên nền tảng.
- SBD và họ tên có thể được biết hoặc đoán: đối chiếu hai trường **không xác thực chủ dữ liệu**. Nếu cần bảo mật mạnh hơn, phải thiết kế mã tra cứu ngẫu nhiên phát riêng, OTP, đăng nhập hoặc hạ tầng chống bot phù hợp. Các cơ chế đó chưa tích hợp trong bản hiện tại.
- Giữ Sheets riêng tư, tối thiểu hóa người có quyền chỉnh sửa và thông báo rõ mục đích, thời hạn lưu, kênh sửa/xóa dữ liệu. Thông tin Web App trả về vẫn được tiết lộ dù bảng gốc riêng tư.
- Không ghi SBD, họ tên hoặc nội dung bảng vào log, URL, analytics hay localStorage. Log chẩn đoán chỉ chứa các mã kiểm soát sẵn. Không có chức năng liệt kê/xuất toàn bộ danh sách.
- Giới hạn hiện tại là 50.000 dòng dữ liệu, đọc A:D mỗi yêu cầu; phù hợp bảng nhỏ/vừa.
- Nunito tải từ `fonts.googleapis.com` và `fonts.gstatic.com`. Nếu bị chặn, trình duyệt dùng font dự phòng. Mã không gửi SBD/họ tên đến Google Fonts.

Việc sửa mã hoặc chạy kiểm thử cục bộ không tự triển khai Web App, tạo bản phát hành hay cập nhật GitHub.
