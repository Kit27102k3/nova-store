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
5. Trong Supabase Dashboard → SQL Editor, chạy nội dung `supabase/migrations/20261029000000_create_profiles.sql` để tạo `public.profiles` có Row Level Security và đồng bộ hồ sơ cho cả tài khoản hiện có lẫn tài khoản đăng ký mới.
6. Khởi động lại ứng dụng sau khi đổi biến môi trường.

Xác nhận email được bật theo cấu hình Supabase. Đường dẫn khôi phục mật khẩu dùng cùng callback `/auth/callback` và chuyển tiếp đến `/account/reset-password`.
Email và mật khẩu xác thực được Supabase Auth quản lý trong `auth.users`; mật khẩu không được lưu ở bảng hồ sơ. Tên hiển thị được lưu trong `auth.users` metadata và đồng bộ sang `public.profiles` sau khi chạy migration.

## Khu vực quản trị

Trang quản trị nằm tại `/admin`. Tạo tài khoản quản trị trong Supabase Dashboard → Authentication → Users, đặt mật khẩu mạnh riêng, sau đó khai báo email tài khoản đó trong biến môi trường server-only `ADMIN_EMAIL` (không dùng tiền tố `NEXT_PUBLIC_`). Khởi động lại ứng dụng sau khi cập nhật cấu hình.

Không có tài khoản hoặc mật khẩu mặc định được nhúng trong ứng dụng. Đăng nhập admin dùng Supabase Auth; chỉ email trùng `ADMIN_EMAIL` được phép xem dashboard. Khu vực quản trị có các màn hình tổng quan, sản phẩm, danh mục, đơn hàng, khách hàng và cài đặt. Nội dung đơn hàng/khách hàng/cài đặt là dữ liệu demo; tồn kho và thao tác chỉnh sửa chưa được kết nối backend.

Khi chạy local với `npm run dev`, có thể mở `/admin?preview=1` để xem dashboard mẫu mà không cần đăng nhập. Chế độ này chỉ có trong môi trường phát triển và không cấp quyền truy cập dữ liệu hay chức năng quản trị thật.

Thanh toán và gửi email liên hệ chưa được kết nối dịch vụ thật.
