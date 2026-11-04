# Nova Store

Giao diện thương mại điện tử Nova Store được xây dựng bằng Next.js App Router, TypeScript và Tailwind CSS.

## Chạy dự án

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Kiểm tra

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Cấu trúc chính

- `app/`: trang chủ, danh sách sản phẩm, trang chi tiết và giỏ hàng.
- `components/`: layout, trang chủ, sản phẩm và trạng thái giỏ hàng.
- `data/products.ts`: dữ liệu sản phẩm và danh mục mẫu.
- `components/store-context.tsx`: giỏ hàng và yêu thích lưu bằng `localStorage`.

Giỏ hàng, yêu thích, tìm kiếm và lọc hoạt động ở phía frontend. Đăng ký, đăng nhập, xác nhận email, đặt lại mật khẩu và phiên tài khoản dùng Supabase Auth.

## Cấu hình xác thực Supabase

1. Tạo file `.env.local` từ `.env.example`.
2. Điền `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bằng publishable key trong Supabase Dashboard (hoặc dùng anon key cũ qua `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Không dùng `service_role` key trong ứng dụng.
3. Giữ `NEXT_PUBLIC_SUPABASE_URL` theo project của bạn và đặt `NEXT_PUBLIC_SITE_URL` bằng origin đang chạy, ví dụ `http://localhost:3000`.
4. Trong Supabase Dashboard → Authentication → URL Configuration, thêm `http://localhost:3000/auth/callback` vào Redirect URLs. Thêm callback URL của domain production khi triển khai.
5. Trong Supabase Dashboard → SQL Editor, chạy lần lượt các file trong `supabase/migrations/` để tạo hồ sơ, catalog, tồn kho, đơn hàng, sổ địa chỉ, danh sách yêu thích, newsletter và các chính sách Row Level Security.
6. Khởi động lại ứng dụng sau khi đổi biến môi trường.

Xác nhận email được bật theo cấu hình Supabase. Đường dẫn khôi phục mật khẩu dùng cùng callback `/auth/callback` và chuyển tiếp đến `/account/reset-password`.
Email và mật khẩu xác thực được Supabase Auth quản lý trong `auth.users`; mật khẩu không được lưu ở bảng hồ sơ. Tên hiển thị được lưu trong `auth.users` metadata và đồng bộ sang `public.profiles` sau khi chạy migration.

## Khu vực quản trị

Trang quản trị nằm tại `/admin`. Tạo tài khoản quản trị trong Supabase Dashboard → Authentication → Users, đặt mật khẩu mạnh riêng, sau đó khai báo email tài khoản đó trong biến môi trường server-only `ADMIN_EMAIL` (không dùng tiền tố `NEXT_PUBLIC_`). Khởi động lại ứng dụng sau khi cập nhật cấu hình.

Không có tài khoản hoặc mật khẩu mặc định được nhúng trong ứng dụng. Đăng nhập admin dùng Supabase Auth; chỉ email trùng `ADMIN_EMAIL` được phép xem dashboard. Để bật quyền đọc/ghi quản trị, đặt `SUPABASE_SERVICE_ROLE_KEY` bằng secret/service-role key của Supabase trong môi trường server; tuyệt đối không dùng tiền tố `NEXT_PUBLIC_` hoặc đưa key này vào client. Dashboard hỗ trợ quản lý sản phẩm, ảnh, giá, biến thể, tồn kho, trạng thái hiển thị, danh mục, chi tiết và trạng thái đơn hàng, khách hàng cùng cài đặt vận chuyển. Đơn đặt hàng được lưu vào Supabase, giá/tồn kho được xác minh phía server và tồn kho được hoàn lại khi hủy đơn. Chỉ triển khai HTTPS và bảo vệ secret key như thông tin xác thực đặc quyền.

Khách hàng có thể cập nhật hồ sơ, lưu nhiều địa chỉ riêng tư, đồng bộ yêu thích khi đăng nhập, xem đơn hàng đã đặt bằng tài khoản và hủy đơn đang chờ xác nhận. Trang đơn hàng hiển thị lịch sử trạng thái và mã tra cứu GHN khi cửa hàng cập nhật. Checkout tự điền email và địa chỉ mặc định; khách vãng lai vẫn đặt COD được nhưng cần đăng nhập để xem lịch sử đơn. Nếu bảng địa chỉ chưa được tạo, sổ địa chỉ tạm lưu trên trình duyệt hiện tại cho đến khi chạy migration `20261102000000_customer_features.sql`. Newsletter lưu email đăng ký vào Supabase. Biểu mẫu liên hệ mở ứng dụng email của khách thay vì giả vờ gửi yêu cầu từ máy chủ.

Chatbot Nova hỗ trợ tư vấn sản phẩm, voucher, giao hàng và đổi trả; khách đã đăng nhập có thể tra cứu đơn thuộc tài khoản của mình bằng mã đơn. Chatbot dùng OpenAI ở server-side; thiết lập `OPENAI_API_KEY` trong môi trường server và tùy chọn `OPENAI_MODEL` (mặc định `gpt-4o-mini`). Không dùng tiền tố `NEXT_PUBLIC_` cho API key. Khi chưa cấu hình key, chatbot vẫn trả lời các câu hỏi FAQ cơ bản bằng dữ liệu cửa hàng. Tin nhắn người dùng được gửi tới OpenAI khi đã cấu hình key; thông tin tra cứu đơn được xử lý trực tiếp trên server và không gửi sang OpenAI.

Voucher được quản lý tại `/admin` → **Khuyến mãi**. Khách có thể nhập mã hoặc chọn trong danh sách ưu đãi tại trang thanh toán; giá trị giảm và tổng đơn được xác minh lại trong RPC giao dịch của Supabase. Sau các migration hiện có, chạy `supabase/migrations/20261104000000_store_vouchers.sql` trong Supabase SQL Editor để tạo bảng, RPC và các mã mẫu `WELCOME10`, `NOVA50K`, `VIP100K`. Lượt dùng được tính khi tạo đơn, kể cả đơn sau đó bị hủy.

Biểu mẫu địa chỉ và checkout hỗ trợ tra cứu địa chỉ, chọn/kéo ghim trên bản đồ OpenStreetMap và lấy vị trí hiện tại qua quyền định vị của trình duyệt. Tra cứu địa chỉ dùng Photon (dữ liệu OpenStreetMap), không cần API key; người dùng được thông báo truy vấn/tọa độ sẽ được gửi tới dịch vụ này. Định vị trên trình duyệt cần HTTPS (hoặc localhost).

Checkout hỗ trợ COD (thanh toán khi nhận hàng) và VNPay. Với VNPay, đơn chỉ được xác nhận thanh toán sau khi callback có chữ ký hợp lệ; đơn thất bại hoặc quá hạn được hủy và hoàn tồn kho. Tích hợp vận chuyển dùng mã vận đơn GHN: tạo vận đơn trong hệ thống GHN, nhập mã tại `/admin` → Đơn hàng → Chi tiết; ứng dụng dùng GHN API để cập nhật trạng thái và trang tra cứu cho khách. Ứng dụng không tự tạo vận đơn GHN.

### Thanh toán trực tuyến VNPay

1. Chạy migration `supabase/migrations/20261103010000_vnpay_payments.sql` sau migration theo dõi GHN.
2. Lấy `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` từ VNPay; đặt trong môi trường server cùng `VNPAY_PAYMENT_URL` và `VNPAY_RETURN_URL`. Sandbox dùng `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`; khi được VNPay cấp thông tin production, dùng URL production `https://pay.vnpay.vn/vpcpay.html`. Không đưa hash secret lên client hay Git.
3. `VNPAY_RETURN_URL` phải cùng origin với `NEXT_PUBLIC_SITE_URL` và trỏ đến `/api/payments/vnpay/return`. Trong cấu hình website của VNPay, khai báo IPN URL `https://<domain-cua-ban>/api/payments/vnpay/ipn`. IPN phải truy cập được từ Internet; localhost không nhận được callback của VNPay.
4. Cấu hình scheduler gọi `POST /api/cron/vnpay-expire` định kỳ (khuyến nghị mỗi 5 phút), dùng header `Authorization: Bearer <CRON_SECRET>`. Đơn chưa thanh toán quá 20 phút sẽ bị hủy và tồn kho được hoàn lại.
5. Đơn hàng giới hạn 1 tỷ đồng theo hạn mức VNPay. Trang quản trị và lịch sử khách hàng hiển thị phương thức/trạng thái thanh toán. Thanh toán VNPay thật cần merchant credentials và domain HTTPS; chưa thể xác nhận giao dịch nếu chưa được cấp các thông tin này.

### Theo dõi GHN và email trạng thái đơn

1. Chạy migration `supabase/migrations/20261103000000_order_tracking_notifications.sql` sau các migration hiện có.
2. Thêm `GHN_TOKEN`, `GHN_SHOP_ID` và `GHN_API_URL` vào môi trường server. Không dùng tiền tố `NEXT_PUBLIC_` cho thông tin xác thực.
3. Cấu hình SMTP bằng `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` và `SMTP_FROM`. Không gửi các giá trị bí mật qua chat hoặc commit vào Git.
4. Tạo `CRON_SECRET` ngẫu nhiên có ít nhất 32 ký tự và cấu hình scheduler của máy chủ gọi `POST /api/cron/shipping-sync` định kỳ (khuyến nghị mỗi 5–10 phút), gửi header `Authorization: Bearer <CRON_SECRET>`. Endpoint đồng bộ tối đa 100 vận đơn và xử lý tối đa 50 email mỗi lượt; gọi lại để xử lý phần còn lại.
5. Khởi động lại ứng dụng sau khi cập nhật biến môi trường. Khi chưa cấu hình SMTP, lịch sử vẫn được lưu và email ở trạng thái chờ; sau khi cấu hình, scheduler sẽ gửi lại các email đang chờ. Email lỗi được thử lại tối đa 5 lần.

Để thử thủ công trên máy local, gửi `POST` đến `http://localhost:3000/api/cron/shipping-sync` với header `Authorization: Bearer <CRON_SECRET>`. Endpoint chỉ hoạt động khi `CRON_SECRET` đã được cấu hình đúng.
