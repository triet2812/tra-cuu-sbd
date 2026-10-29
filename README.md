# SGUET · Tra cứu kết quả vòng đơn

Mã nguồn hoàn chỉnh: [Code.gs](Code.gs) và [Index.html](Index.html). Giao diện Nunito, nền trắng, đen và xanh dương nhạt; hai ô viền đen bo tròn và nút kính lúp tròn. Ban đầu chỉ hiện tiêu đề tra cứu; lời chúc mừng và khung viền đỏ chỉ xuất hiện sau khi server xác nhận có ban đậu.

## 1. Chuẩn bị bảng tính riêng tư

1. Dùng tài khoản ban tổ chức tạo/mở Google Sheets. Giữ **Chia sẻ → Quyền truy cập chung → Bị hạn chế**. Không bật **Xuất bản lên web**. Chỉ cấp quyền chỉnh sửa cho người quản lý cần thiết.
2. Tab dữ liệu mặc định là **DanhSach**. Nếu tab thực tế có tên khác, sửa `CONFIG.sheetName` trong `Code.gs`.
3. Hàng 1 phải có đúng bốn tiêu đề theo thứ tự. Dữ liệu bắt đầu từ hàng 2:

   | Cột A | Cột B | Cột C | Cột D |
   | --- | --- | --- | --- |
   | SBD | Họ và tên | Điền đơn | Đậu |

4. Định dạng cột A là **Định dạng → Số → Văn bản thuần túy** trước khi nhập/import. Hỗ trợ SBD 1–30 ký tự chữ cái ASCII và chữ số, ví dụ `X04`, `00123`. Không chuyển SBD thành số. Định dạng lại không khôi phục số 0 đã bị Sheets xóa; phải sửa từ nguồn dữ liệu.
5. Cột C và D: **Dữ liệu → Xác thực dữ liệu → Trình đơn thả xuống**, thêm ba lựa chọn, dùng kiểu chip và bật cho phép chọn nhiều mục:

   - Ban Tư vấn - Hỗ trợ
   - Ban Truyền thông
   - Ban Tổ chức sự kiện

6. C là các ban điền đơn; **D mới là các ban đậu**. D để trống có nghĩa là chưa vượt qua vòng đơn. Không dùng giá trị `Không`, `Chưa đậu` hay dấu gạch thay cho ô trống.
7. Mỗi SBD nên là duy nhất. Nếu có nhiều dòng trùng cả SBD lẫn tên sau chuẩn hóa, server trả lỗi thay vì tùy ý chọn một dòng.

Server dùng `SpreadsheetApp.openById()` và `getDisplayValues()` đọc A:D mỗi lần tra cứu. Giá trị chip nhiều lựa chọn được Apps Script đọc thành chuỗi phân cách bằng dấu phẩy; mã tách **tất cả** lựa chọn, loại mục trùng và giữ thứ tự. Hỗ trợ thêm dấu chấm phẩy/xuống dòng cho dữ liệu nhập ngoài. Tên ban không nằm trong ba lựa chọn được phép gây lỗi chung để tránh trả kết quả thiếu/sai. Không tách theo dấu gạch vì tên ban có dấu gạch. Cột C không tham gia kết quả và không gửi xuống trình duyệt.

## 2. Cấu hình Google Apps Script

1. Trong Sheets, chọn **Tiện ích mở rộng → Apps Script**.
2. Dán toàn bộ [Code.gs](Code.gs) vào tệp `Code.gs`.
3. Tạo tệp **HTML**, tên **Index**, dán toàn bộ [Index.html](Index.html). Nếu đã có, thay nội dung tệp hiện tại. Không cần thư viện hay API key.
4. Lấy ID bảng tính từ URL: phần nằm giữa `/d/` và `/edit`.
5. Vào **Cài đặt dự án → Thuộc tính tập lệnh → Thêm thuộc tính tập lệnh**:

   | Tên | Giá trị |
   | --- | --- |
   | SPREADSHEET_ID | ID bảng tính thật của bạn |

6. Lưu. Không đưa ID hay thông tin xác thực vào frontend. Không có dữ liệu ứng viên mẫu cố định trong hai tệp triển khai; fixtures chỉ nằm trong thư mục kiểm thử và không cần tải lên Apps Script.

## 3. Triển khai Web App khi bạn chủ động thực hiện

1. Chọn **Triển khai → Triển khai mới → Ứng dụng web**.
2. **Thực thi dưới danh nghĩa: Tôi**, bằng tài khoản có quyền đọc bảng tính.
3. **Ai có quyền truy cập: Bất kỳ ai / Anyone** để người tra cứu không cần đăng nhập Google. Bảng tính vẫn giữ riêng tư.
4. Triển khai và cấp quyền bằng tài khoản quản lý sau khi kiểm tra mã.
5. Dùng URL kết thúc bằng **`/exec`**. Mở cửa sổ ẩn danh chưa đăng nhập Google để xác nhận. `/dev` chỉ dành cho người có quyền chỉnh sửa.
6. Nếu tổ chức không có lựa chọn **Bất kỳ ai**, cần quản trị viên Workspace cho phép hoặc tài khoản triển khai được tổ chức chấp thuận. Không công khai Sheets để khắc phục.
7. Với Web App đang tồn tại: sau khi thay hai tệp, chọn **Triển khai → Quản lý các bản triển khai → Chỉnh sửa → Phiên bản mới → Triển khai** để giữ URL hiện tại. Đây là thao tác bạn tự thực hiện khi sẵn sàng.

Sửa dữ liệu Sheets không cần triển khai lại: lần tra cứu tiếp theo đọc dữ liệu mới, không cache kết quả/danh sách. Chỉ sửa mã mới cần cập nhật phiên bản Web App. HTML phải chạy qua Apps Script vì sử dụng `google.script.run`, không dùng như trang tĩnh độc lập.

## 4. Quy tắc và nội dung kết quả

- Bắt buộc nhập cả SBD và họ tên; server kiểm tra lại kể cả khi bỏ qua kiểm tra trình duyệt.
- SBD được loại khoảng trắng đầu/cuối và so khớp không phân biệt hoa/thường, không xóa số 0 hoặc khoảng trắng giữa mã.
- Họ tên được chuẩn hóa Unicode NFC, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng thừa và so khớp không phân biệt hoa/thường. Vẫn phân biệt dấu tiếng Việt, không khớp một phần, không sửa chính tả.
- Cả hai phải khớp **cùng một dòng**. Không khớp trả đúng: **“Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra lại SBD và họ tên.”**
- Khớp và D có ít nhất một ban: tiêu đề **“SGUET CHÚC MỪNG BẠN ĐÃ ĐỖ VÒNG ĐƠN!”** và **“Bạn đã đậu kết quả vòng đơn của [tất cả các ban đậu].”**
- Bên dưới là khung viền đỏ: **“Bạn hãy xác nhận và hãy nhớ BẠN CHỈ ĐƯỢC PHÉP tham gia phỏng vấn Ban mà bạn đã đậu vòng đơn.”** Đây là lời nhắc, không ghi nhận xác nhận tham gia hay sửa dữ liệu Sheets.
- Khớp nhưng D trống: thông báo chưa vượt qua vòng đơn; không chúc mừng và không hiện khung nhắc phỏng vấn.
- Khi thay đổi thông tin nhập hoặc bắt đầu tra cứu khác, kết quả cũ bị ẩn. Phản hồi cho thông tin đã bị sửa trong lúc chờ cũng bị bỏ qua.
- Mọi dữ liệu động được hiển thị bằng `textContent`/text node; không chèn HTML từ ô Sheets. Server chỉ trả trạng thái và danh sách ban của dòng khớp, không trả toàn bộ danh sách, SBD, họ tên hoặc cột C.

## 5. Kiểm thử trước khi dùng thật

Dùng bảng thử riêng với dữ liệu giả do bạn tạo, không thử tải lớn trên dữ liệu ứng viên thật:

1. D chọn một ban, tra cứu đúng cả hai trường → chỉ hiện ban đó.
2. D chọn hai/ba chip → tất cả ban xuất hiện, không chỉ chip đầu. Thử trực tiếp chip Sheets để xác nhận tích hợp Apps Script.
3. C có nhiều ban nhưng D trống → thông báo chưa vượt qua, không chúc mừng.
4. Đúng SBD nhưng tên của dòng khác/sai dấu/tên thiếu → thông báo không tìm thấy. Thử hoa/thường và khoảng trắng thừa → vẫn tìm thấy đúng người.
5. Kiểm tra `X04` và SBD có số 0 đầu; không khớp SBD rút gọn.
6. Sửa D trong Sheets và tra cứu lại sau 5 giây → kết quả mới ngay, không triển khai lại.
7. Thử trên máy tính, điện thoại, bàn phím Tab/Enter, cửa sổ ẩn danh. Kiểm tra đang tải, không tìm thấy, lỗi kết nối và dữ liệu cũ không còn xuất hiện khi nhập thông tin khác.

Kiểm thử tự động cục bộ (Node.js có sẵn, không cần cài dependencies):

```sh
cd /workspace/tra-cuu-sbd
node tests/server.test.cjs
node tests/frontend.test.cjs
```

Bộ kiểm thử dùng mock dịch vụ Google và DOM: kiểm tra logic đối chiếu, nhiều ban, D trống, dữ liệu mới, quota, thông báo và điều kiện chúc mừng. Chưa xác minh tích hợp bằng Sheets thật, quyền tài khoản Google hay hiển thị bằng trình duyệt thật. Chỉ coi việc triển khai hoạt động sau khi hoàn thành kiểm tra `/exec` trên tài khoản của bạn.

## 6. Hạn chế tra cứu hàng loạt và bảo vệ dữ liệu

- Giới hạn server **chung toàn ứng dụng**: 60 yêu cầu/phút, 1.000/ngày UTC, cấu hình trong `CONFIG`. Tính cả yêu cầu sai, cập nhật bộ đếm `LOOKUP_QUOTA` trong Script Properties dưới `ScriptLock`. Hết quota hoặc không lấy được khóa thì từ chối, không đọc dữ liệu ứng viên. Bộ đếm không chứa SBD/họ tên. Nền tảng Apps Script còn có hạn mức riêng.
- Frontend chờ 5 giây giữa các lần gửi, chặn gửi đồng thời và có honeypot. Các lớp frontend có thể bị bỏ qua; server vẫn kiểm tra cả hai trường và quota.
- Apps Script RPC công khai không có IP khách đáng tin cậy. Đây không phải giới hạn từng cá nhân, không bảo đảm chặn bot: người xấu có thể dùng hết quota chung, khiến người dùng khác bị từ chối. Quota không ngăn hoàn toàn việc làm cạn tài nguyên nền tảng.
- SBD và họ tên có thể được biết/đoán: đối chiếu hai trường **không xác thực chủ dữ liệu**. Nếu cần bảo mật mạnh hơn, phải thêm mã tra cứu ngẫu nhiên phát riêng/OTP hoặc đăng nhập, hay chuyển sang hạ tầng có chống bot và định danh đáng tin cậy. Các bước này chưa được tích hợp trong phiên bản hiện tại.
- Không log SBD, họ tên, dữ liệu bảng hay lỗi chi tiết; không đưa vào URL, analytics hoặc localStorage. Không có chức năng liệt kê/xuất dữ liệu. Hàm trợ giúp kết thúc bằng `_` để không thể gọi bằng `google.script.run`.
- Giữ bảng riêng tư, tối thiểu hóa người được chỉnh sửa, chỉ dùng thông tin theo mục đích đã thông báo và có chính sách sửa/xóa/lưu giữ phù hợp. Dữ liệu mà web app trả về vẫn là thông tin được tiết lộ dù bảng gốc riêng tư.
- Mỗi yêu cầu đọc tối đa 50.000 dòng dữ liệu A:D; phù hợp bảng nhỏ/vừa. Không thêm hàng/cột thừa hoặc dùng thử tải lớn trên ứng dụng công khai.
- Font Nunito tải từ Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`); nếu mạng người dùng chặn font thì dùng font dự phòng. Không gửi SBD hay họ tên đến Google Fonts.

Không có thao tác triển khai, tạo bản phát hành, commit hay push GitHub tự động trong các bước kiểm thử cục bộ.
