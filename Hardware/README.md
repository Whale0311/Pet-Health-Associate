# Pet Smart Collar - Hardware 🐕

Phân hệ phần cứng của hệ thống theo dõi sức khỏe thú cưng. Sử dụng ESP32 để thu thập dữ liệu sinh hiệu, phân tích hành vi bằng Edge AI, và gửi dữ liệu real-time qua Bluetooth Low Energy (BLE).

## 📋 Mục lục

- [Tính năng](#tính-năng)
- [Phần cứng cần thiết](#phần-cứng-cần-thiết)
- [Cài đặt](#cài-đặt)
- [Wiring Diagram](#wiring-diagram)
- [BLE Configuration](#ble-configuration)
- [Upload Code](#upload-code)
- [Troubleshooting](#troubleshooting)

---

## ✨ Tính năng

- 📊 **Đo lường sinh hiệu**: Nhịp tim, nhiệt độ, độ ẩm real-time
- 🤖 **Edge AI**: Phân loại 4 trạng thái hành vi (Idle, Playing, Trotting, Walking)
- 🔋 **BLE tiết kiệm năng lượng**: Hoạt động lâu dài với pin Li-po
- 📱 **Kết nối không dây**: BLE Server tương thích iOS/Android
- 🔄 **Real-time**: Gửi dữ liệu liên tục qua BLE notify
- ⚡ **Multi-core**: Sử dụng FreeRTOS để xử lý song song

---

## 🛠 Phần cứng cần thiết

| Linh kiện | Mô tả | Ghi chú |
|-----------|--------|--------|
| **ESP32** | Vi điều khiển chính (có BLE tích hợp) | DevKit v1 |
| **MPU6050** | Gia tốc kế + Con quay hồi chuyển | I2C interface |
| **MAX30105** | Cảm biến nhịp tim (PPG) | I2C interface |
| **SHT31** | Cảm biến nhiệt độ & độ ẩm | I2C interface |
| **Pin Li-po** | Nguồn cấp điện | 3.7V-4.2V |
| **Mạch sạc TP4056** | Bảo vệ & sạc pin | Tùy chọn |
| **Cáp USB Type-C** | Nạp code và cấp điện | Cho ESP32 |

---

## 📦 Cài đặt

### 1. Cài đặt Arduino IDE / PlatformIO

**Arduino IDE:**
```bash
# Tải tại: https://www.arduino.cc/en/software
# Hoặc: choco install arduino-ide (Windows)
```

**PlatformIO (VS Code):**
```bash
# Cài đặt extension PlatformIO IDE trên VS Code
```

### 2. Thêm hỗ trợ ESP32

**Arduino IDE:**
- Preferences → Additional Boards Manager URLs
- Thêm: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
- Boards Manager → Tìm "esp32" → Cài đặt

**PlatformIO:**
- Tự động nhận diện khi chọn board ESP32

### 3. Cài đặt Thư viện

Tất cả thư viện có thể cài từ **Library Manager** (Arduino IDE):

```
Adafruit MPU6050
Adafruit SHT31
MAX30105 Library
DFRobot Heart Rate
BLEDevice (Arduino-esp32 built-in)
Pet_Behavior_Tracker (từ Edge Impulse)
```

**Cài đặt Edge AI Model:**
- Tải file `.zip` từ Edge Impulse Studio
- Arduino IDE: Sketch → Include Library → Add .ZIP Library
- Chọn file zip đã tải

---

## 🔌 Wiring Diagram

### I2C Pins (Cảm biến)

```
ESP32        | MPU6050 | MAX30105 | SHT31
-------------|---------|----------|-------
GPIO 21 (SDA)| SDA     | SDA      | SDA
GPIO 22 (SCL)| SCL     | SCL      | SCL
3.3V         | VCC     | VCC      | VCC
GND          | GND     | GND      | GND
```

### BLE

- Built-in trên ESP32 (không cần wiring thêm)

### Power

```
Li-po Battery (3.7V) → ESP32 5V (qua regulator) & BAT pin
USB Type-C → Cho phép cấp điện & upload code
```

> 📌 **Lưu ý**: I2C addresses mặc định là 0x68 (MPU6050), 0x44 (SHT31), 0x57 (MAX30105)

---

## 📡 BLE Configuration

### Service & Characteristics

```
Service UUID: 19B10000-E8F2-537E-4F6C-D104768A1214

├─ Behavior Code (19B10001-...)
│  ├─ 0 = Nằm (Idle/Lying)
│  ├─ 1 = Chơi (Playing)
│  ├─ 2 = Chạy kiệu (Trotting)
│  └─ 3 = Đi bộ (Walking)
│
├─ Heart Rate (19B10002-...)
│  └─ bpm (0-255)
│
├─ Temperature (19B10003-...)
│  └─ °C (decimal)
│
└─ Humidity (19B10004-...)
   └─ % (0-100)
```

**Device Name**: `Pet_Collar_XXXXXX` (XXXXXX = MAC address)

---

## 🚀 Upload Code

### Bước 1: Kết nối
1. Cắm ESP32 vào máy tính qua USB Type-C
2. Chọn Tools → Port → COM port của ESP32
3. Chọn Tools → Board → ESP32 Dev Module

### Bước 2: Biên dịch & Upload
```bash
# Arduino IDE
# Bấm Upload (mũi tên →)

# PlatformIO
# Bấn Upload trên status bar
```

### Bước 3: Monitor Serial
```bash
# Xem output từ board
Arduino IDE: Tools → Serial Monitor (Baud: 115200)
PlatformIO: Bấn Monitor trên status bar
```

**Output mong đợi:**
```
✅ MPU6050 initialized!
✅ MAX30105 initialized!
✅ SHT31 initialized!
✅ Edge AI Model loaded!
🚀 BLE Server started. Name: Pet_Collar_XXXXXX
...
```

---

## 📂 Cấu trúc Code

| File | Mục đích |
|------|---------|
| `Hardware.ino` | Code chính - BLE server, cảm biến, AI inference |
| `TestMPU/` | Test & calibrate MPU6050 (accelerometer) |
| `Test_AI_MPU/` | Test mô hình AI với dữ liệu MPU6050 |

---

## ⚠️ Lưu ý quan trọng

1. **Tần số lấy mẫu (Sampling Rate)**
   - Phải khớp với tần số huấn luyện trên Edge Impulse
   - Mặc định: 100 Hz

2. **Tránh delay()**
   - Dùng `millis()` thay vì `delay()` trong loop chính
   - `delay()` sẽ gián đoạn BLE notifications

3. **I2C Address Conflicts**
   - Nếu có nhiều thiết bị I2C, kiểm tra địa chỉ
   - Dùng I2C Scanner để quét

4. **Power Management**
   - Sạc pin trước khi sử dụng
   - Monitor nguồn cấp nếu có lỗi
   - Có thể bật Deep Sleep để tiết kiệm

---

## 🔧 Troubleshooting

### ❌ Board không được nhận diện
```
Giải pháp:
1. Cài đặt driver CH340/FTDI
2. Thử cáp USB khác
3. Chọn đúng Board: ESP32 Dev Module
```

### ❌ Lỗi "Timed out waiting for packet header"
```
Giải pháp:
1. Nhấn nút BOOT trên board khi upload
2. Kiểm tra baud rate (115200)
3. Thử reset board: Press EN button
```

### ❌ Cảm biến không được khởi tạo
```
Giải pháp:
1. Kiểm tra wiring I2C (SDA/SCL)
2. Chạy I2C Scanner để tìm address
3. Kiểm tra điện áp 3.3V trên cảm biến
```

### ❌ BLE không kết nối được
```
Giải pháp:
1. Kiểm tra BLE được bật trên điện thoại
2. Khởi động lại board
3. Đảm bảo firmware ESP32 updated
```

### ❌ AI Model error
```
Giải pháp:
1. Kiểm tra file .zip Edge Impulse được thêm
2. Include header đúng: #include <...._inferencing.h>
3. Kiểm tra tần số lấy mẫu khớp với training
```

---

## 📊 Kiểm tra Hiệu suất

### Serial Monitor Output
```bash
# Khi kết nối BLE:
📱 App Android đã kết nối!

# Khi nhận dữ liệu:
Behavior: 0 | HR: 85 bpm | Temp: 38.5°C | Humidity: 65%
Behavior: 1 | HR: 95 bpm | Temp: 38.6°C | Humidity: 66%

# Khi ngắt kết nối:
📵 App Android đã ngắt kết nối!
```

### BLE Scanning (Phone)
- Dùng BLE Scanner app
- Tìm device "Pet_Collar_XXXXXX"
- Connect và read characteristics

---

## 🔌 Pin Configuration

```
ESP32 Pin | Function
----------|----------
GPIO 21   | I2C SDA
GPIO 22   | I2C SCL
GPIO 5V   | Power supply (cảm biến)
GPIO GND  | Ground
```

---

## 📚 Tài liệu tham khảo

- [ESP32 Official Docs](https://docs.espressif.com/projects/esp32-rtos-sdk/en/latest/)
- [Arduino-esp32 GitHub](https://github.com/espressif/arduino-esp32)
- [Edge Impulse Docs](https://docs.edgeimpulse.com/)
- [BLE for Arduino](https://github.com/espressif/arduino-esp32/tree/master/libraries/BLE)

---

**Version**: 1.0.0  
