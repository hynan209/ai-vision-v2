# 🚦 Vision AI - Hệ thống giám sát và phát hiện tai nạn giao thông thông minh

[![Python](https://img.shields.io/badge/Python-3.10-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100-green.svg)](https://fastapi.tiangolo.com/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-ultralytics-red.svg)](https://github.com/ultralytics/ultralytics)

## 📌 Giới thiệu

**Vision AI** là hệ thống sử dụng trí tuệ nhân tạo để tự động phát hiện va chạm giao thông từ camera, phân tích mức độ nghiêm trọng, và gửi cảnh báo qua email trong thời gian thực.

**🏆 Sản phẩm dự thi:** Hội thi Tin học trẻ Toàn quốc lần thứ XXXIII, năm 2026 - Bảng D3 (Phần mềm sáng tạo)

## ✨ Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| 🔍 Phát hiện va chạm | Sử dụng YOLOv8 để nhận diện phương tiện và va chạm |
| 📊 Phân loại mức độ | EfficientNetB0 đánh giá hư hỏng: Nhẹ / Vừa / Nghiêm trọng |
| 📧 Cảnh báo email | Tự động gửi ảnh hiện trường đến CSGT và cấp cứu |
| 🎥 Đa camera | Quản lý nhiều camera độc lập, bật/tắt riêng biệt |
| 📡 Realtime WebSocket | Cập nhật trạng thái, log, FPS tức thì |
| 📋 Hồ sơ sự cố | Lưu lại thời gian, vị trí, mức độ từng vụ tai nạn |

## 🛠️ Công nghệ sử dụng

### Backend
- **Python 3.10** - Ngôn ngữ chính
- **FastAPI** - Framework xây dựng API
- **YOLOv8** - Phát hiện phương tiện
- **EfficientNetB0** - Phân loại mức độ hư hỏng
- **OpenCV** - Xử lý ảnh và video
- **WebSocket** - Giao tiếp realtime

### Frontend
- **React 18** - Thư viện giao diện
- **JavaScript** - Ngôn ngữ lập trình
- **WebSocket** - Nhận dữ liệu realtime
- **CSS3** - Thiết kế giao diện

## 📦 Cấu trúc thư mục
```bash
vision-ai/
├── backend/
│ ├── api.py # API chính
│ ├── src/
│ │ ├── Configs.py # Cấu hình AI
│ │ └── Detection.py # Phát hiện va chạm
│ └── models/ # Model AI
├── frontend/
│ ├── src/
│ │ ├── App.js # Component chính
│ │ └── App.css # Style
│ └── public/ # Tài nguyên tĩnh
├── videos/ # Video mẫu
├── docs/ # Tài liệu thuyết minh
└── README.md # File này
```

## ⚠️ LƯU Ý QUAN TRỌNG

**Repository này chỉ chứa mã nguồn (source code) của dự án.**

Các thành phần sau KHÔNG được upload lên GitHub do vượt quá giới hạn dung lượng cho phép (tối đa 100MB mỗi file):

| Thành phần | Dung lượng | Lý do |
|------------|-----------|-------|
| Môi trường Anaconda | 1.5 - 3 GB | Chứa toàn bộ thư viện Python |
| Thư mục node_modules | 300 - 500 MB | Thư viện Frontend |

**Do đó, việc clone trực tiếp từ GitHub về sẽ KHÔNG THỂ CHẠY ĐƯỢC** vì thiếu môi trường và model AI.

## 📦 Để có bản đầy đủ (có thể chạy ngay)

### Cách 1: Sử dụng USB (Khuyến nghị)

USB được cung cấp kèm theo hồ sơ dự thi đã có sẵn:
- Môi trường Anaconda đầy đủ
- Model AI đã huấn luyện
- Video mẫu để demo

**Cách chạy:**
1. Cắm USB vào máy tính
2. Double-click vào file `Start_VisionAI_demo.bat`
3. Đợi 10-15 giây
4. Mở trình duyệt, truy cập `http://localhost:3000`

### Cách 2: Liên hệ tác giả

Gửi email đến địa chỉ dưới đây để nhận link tải bản đầy đủ.

## 🚀 Cách chạy (nếu có đầy đủ file)

### Yêu cầu hệ thống
- CPU: Intel Core i5 trở lên
- RAM: 8GB (khuyến nghị 16GB)
- Ổ cứng trống: 5GB
- Hệ điều hành: Windows 10/11, Ubuntu 20.04+, macOS 12+

### Chạy từ USB
1. Cắm USB vào máy tính
2. Double-click vào file `Start_VisionAI_Portable.bat`
3. Đợi 10-15 giây
4. Mở trình duyệt, truy cập `http://localhost:3000`


## 🌐 Truy cập giao diện

Sau khi khởi động hệ thống, mở trình duyệt tại:

```text
http://localhost:3000
```

---

## 📧 Cấu hình Email cảnh báo

Hệ thống hỗ trợ gửi email tự động khi phát hiện tai nạn.

### Các bước cấu hình:

1. Mở tab **Cấu Hình** trên giao diện.
2. Nhập **Email gửi** (khuyến nghị sử dụng Gmail).
3. Nhập **Mật khẩu ứng dụng Gmail**.
4. Nhập **Email nhận cảnh báo**.
5. Nhấn **BẬT CAMERA** để bắt đầu giám sát.

### Tạo mật khẩu ứng dụng Gmail

```
Google Account
→ Bảo mật
→ Xác minh 2 bước
→ Mật khẩu ứng dụng
```

---

## 📊 Hiệu năng hệ thống

* Độ chính xác phát hiện: khoảng **80%** trong điều kiện ánh sáng tốt.
* Thời gian xử lý: khoảng **0.1 – 0.3 giây/frame** trên CPU.
* Hỗ trợ nguồn vào:

  * File video
  * Webcam

---

## 🔧 Hướng phát triển trong tương lai

* Thu thập thêm dữ liệu thực tế để nâng cao độ chính xác.
* Tối ưu mô hình bằng Quantization và ONNX.
* Tích hợp camera RTSP/IP Camera.
* Bổ sung cơ chế theo dõi đối tượng (ByteTrack).
* Xây dựng hệ thống lưu trữ sự cố và phát lại video.
* Hỗ trợ gửi cảnh báo qua Telegram, Zalo và ứng dụng di động.
* Tích hợp cơ sở dữ liệu để lưu lịch sử sự kiện.

---

## 👥 Tác giả

### Thí sinh thực hiện

* **Họ và tên:** Huỳnh Phạm Nhật Nam

## 📧 Liên hệ

* GitHub: https://github.com/hynan209
* Email: huynhnam2009tgdd@gmail.com

---

## 📄 Giấy phép

Dự án được phát triển phục vụ mục đích nghiên cứu, học tập và tham gia **Hội thi Tin học trẻ Toàn quốc lần thứ XXXIII năm 2026 – Bảng D3 (Phần mềm sáng tạo)**.

---

⭐ Nếu bạn thấy dự án hữu ích, hãy để lại một ngôi sao trên GitHub!
