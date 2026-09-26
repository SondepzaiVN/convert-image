# Chuyển đổi định dạng ảnh

Ứng dụng web miễn phí để chuyển đổi ảnh hai chiều ngay trong trình duyệt. Ảnh không được tải lên máy chủ.

Website: [https://convert-image.dangson.id.vn](https://convert-image.dangson.id.vn)

## Định dạng hỗ trợ

Mỗi định dạng dưới đây đều có thể dùng làm đầu vào hoặc đầu ra:

- JPG / JPEG
- PNG
- WebP
- AVIF
- HEIC / HEIF

Ứng dụng nhận diện định dạng dựa trên nội dung tệp, không chỉ dựa vào phần mở rộng.

## Tính năng

- Chuyển đổi nhiều ảnh trong một lần.
- Điều chỉnh chất lượng ảnh đầu ra.
- Tải từng ảnh hoặc tải tất cả dưới dạng ZIP.
- Giao diện tiếng Việt và tiếng Anh.
- Xử lý bằng WebAssembly trong Web Worker trên thiết bị của người dùng.
- Không cần máy chủ, cơ sở dữ liệu hoặc biến môi trường.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```powershell
npm install
npm run dev
```

## Tạo bản phát hành

```powershell
npm run build
```

Các tệp tĩnh được tạo trong thư mục `dist`.

## Triển khai lên Vercel

1. Đưa mã nguồn lên một repository Git.
2. Trong Vercel, chọn **Add New → Project** và import repository.
3. Chọn Framework Preset là **Vite**. Vercel thường tự nhận diện các thiết lập sau:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Deploy dự án. Dự án này không cần biến môi trường hay Vercel Functions.
5. Trong **Project Settings → Domains**, thêm `convert-image.dangson.id.vn`.
6. Tại nơi quản lý DNS của `dangson.id.vn`, tạo bản ghi CNAME cho `convert-image` theo đúng giá trị Vercel hiển thị, sau đó chờ Vercel xác minh và cấp HTTPS.

Mỗi lần bạn push lên nhánh production, Vercel sẽ tự build và cập nhật website. Các pull request và nhánh khác có thể nhận URL preview riêng.

## Cách hoạt động

- Codec ảnh chạy bằng WebAssembly trong Web Worker.
- Ảnh được xử lý tuần tự để giới hạn mức sử dụng bộ nhớ.
- Metadata của ảnh nguồn không được sao chép sang ảnh đầu ra.

## Giấy phép

Mã nguồn ứng dụng được phát hành theo GPL-3.0-or-later do bản dựng HEIC sử dụng x265. Xem `LICENSE.md` và `THIRD_PARTY_NOTICES.md` trước khi phân phối lại.

---

# Image Format Converter

A free web application for bidirectional image conversion directly in the browser. Images are never uploaded to a server.

Website: [https://convert-image.dangson.id.vn](https://convert-image.dangson.id.vn)

## Supported formats

Each format below can be used as either an input or output format:

- JPG / JPEG
- PNG
- WebP
- AVIF
- HEIC / HEIF

The application detects formats from file contents instead of relying only on file extensions.

## Features

- Convert multiple images in one batch.
- Adjust output image quality.
- Download files individually or together as a ZIP archive.
- Vietnamese and English interface.
- On-device processing with WebAssembly in a Web Worker.
- No server, database, or environment variables required.

## Local development

Node.js 22 or later is required.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Static production files are generated in `dist`.

## Deploy to Vercel

1. Push the source code to a Git repository.
2. In Vercel, select **Add New → Project** and import the repository.
3. Select **Vite** as the Framework Preset. Vercel normally detects these settings automatically:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Deploy the project. This application does not require environment variables or Vercel Functions.
5. Under **Project Settings → Domains**, add `convert-image.dangson.id.vn`.
6. At the DNS provider for `dangson.id.vn`, create a CNAME record for `convert-image` using the exact value shown by Vercel. Wait for Vercel to verify the record and provision HTTPS.

Every push to the production branch triggers a new production build. Pull requests and other branches can receive their own preview URLs.

## How it works

- Image codecs run as WebAssembly inside a Web Worker.
- Images are processed sequentially to limit memory usage.
- Source image metadata is not copied to output files.

## License

This application is distributed under GPL-3.0-or-later because its HEIC build uses x265. Review `LICENSE.md` and `THIRD_PARTY_NOTICES.md` before redistribution.
