# Pet Health Associate 🐕

Hệ thống IoT thông minh theo dõi sức khỏe thú cưng theo thời gian thực. Kết hợp phần cứng (Hardware), ứng dụng di động (Mobile App), và backend API để cung cấp giải pháp toàn diện cho chăm sóc thú cưng.

## 🎯 Giới thiệu

Pet Health Associate là một nền tảng tích hợp giúp chủ thú cưng:
- 📊 **Theo dõi sức khỏe** thú cưng 24/7 qua thiết bị Smart Collar
- 🤖 **Phân tích hành vi** với mô hình Machine Learning
- 🔔 **Nhận cảnh báo** khi phát hiện bất thường
- 📱 **Quản lý đa thiết bị** từ ứng dụng di động
- 👨‍👩‍👧‍👦 **Chia sẻ dữ liệu** với gia đình

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────┐
│                  Mobile App (iOS/Android)           │
│         React Native + Expo Router + BLE            │
└────────────────────┬────────────────────────────────┘
                     │
                     │ REST API + Socket.IO
                     │
┌────────────────────▼────────────────────────────────┐
│          Backend Server (Node.js/Express)           │
│  PostgreSQL + JWT Auth + Real-time Updates          │
└────────────────────┬────────────────────────────────┘
                     │
                     │ BLE / API
                     │
┌────────────────────▼────────────────────────────────┐
│     Smart Collar Hardware (ESP32 Microcontroller)   │
│  Sensors: MPU6050, MAX30105, SHT31 + Edge AI        │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc Project

```
Pet_Health_Associate/
│
├── 📱 Pet_Collar_App/              # Mobile Application
│   ├── app/                        # Expo Router pages (file-based routing)
│   ├── components/                 # Reusable React components
│   ├── hooks/                      # Custom React hooks
│   ├── package.json
│   └── README.md
│
├── 🖥️ Pet_Collar_Backend/           # Backend API Server
│   ├── config/                     # Database configuration
│   ├── middlewares/                # Authentication middleware
│   ├── routes/                     # API endpoints
│   ├── server.js                   # Express server entry point
│   ├── package.json
│   └── README.md
│
├── ⚙️ Hardware/                      # Embedded System Code
│   ├── Hardware.ino                # Main ESP32 firmware
│   ├── TestMPU/                    # MPU6050 sensor test
│   ├── Test_AI_MPU/                # AI model inference test
│   └── README.md
│
├── 📊 DogMoveData.csv/             # Training Dataset
│   ├── DogMoveData.csv             # Raw accelerometer data
│   ├── process_data.py             # Data preprocessing script
│   └── EdgeImpulse_Data_Split/     # Formatted data for Edge Impulse
│
├── 📄 package.json                 # Root dependencies
└── 📋 README.md                    # Documentation (you are here)
```

---

## 🚀 Quick Start

### Yêu cầu
- **Node.js** v14+
- **npm** v6+
- **PostgreSQL** v12+
- **Git**
- **Arduino IDE** (cho hardware)

### Cài đặt Backend

```bash
cd Pet_Collar_Backend
npm install
cp .env.example .env  # Cấu hình biến môi trường
npm run dev           # Chạy development server
```

Server sẽ chạy tại: `http://localhost:3000`

### Cài đặt Mobile App

```bash
cd Pet_Collar_App
npm install
npm start            # Chạy Expo dev server
# Quét QR code với Expo Go app hoặc nhấn 'a' cho Android emulator
```

### Cài đặt Hardware

```bash
# 1. Mở Arduino IDE
# 2. Mở file: Hardware/Hardware.ino
# 3. Cài đặt thư viện cần thiết (xem Hardware/README.md)
# 4. Chọn board ESP32 Dev Module
# 5. Upload code
```

---

## 🔑 Tính năng Chính

### 🔐 Authentication
- Đăng ký/Đăng nhập với email
- JWT token-based authentication (30 ngày)
- Thay đổi mật khẩu an toàn

### 🐕 Pet Management
- Thêm/Xóa thú cưng qua MAC address
- Chia sẻ thú cưng với gia đình
- Xem lịch sử sức khỏe
- Quản lý thông tin cơ bản (tên, tuổi, cân nặng, ảnh)

### 💓 Health Monitoring
- **Nhịp tim**: 0-300 bpm
- **Nhiệt độ**: 10-50°C
- **Độ ẩm**: 0-100%
- **Hành vi**: Idle, Playing, Trotting, Walking
- **Bản ghi**: Lưu trữ lâu dài trên database

### 🤖 AI/ML Features
- Mô hình học máy được huấn luyện trên Edge Impulse
- Phân loại hành vi từ dữ liệu gia tốc kế (MPU6050)
- Suy luận trực tiếp trên thiết bị (Edge AI)

### 🔔 Alerts & Notifications
- Cảnh báo nhịp tim bất thường (>140 bpm khi nằm)
- Cảnh báo nhiệt độ cao (>39.5°C)
- Cảnh báo nhịp tim tăng đột ngột (>160 bpm)
- Push notifications thời gian thực

### 📱 Real-time Updates
- Socket.IO events cho dữ liệu sức khỏe mới
- Cập nhật thông báo tức thì
- BLE notifications từ collar

---

## 🛠 Tech Stack

### Frontend
- **React Native** - Mobile framework
- **Expo** - Cross-platform toolkit
- **Expo Router** - File-based routing
- **React Navigation** - Navigation library
- **Socket.IO Client** - Real-time communication
- **React Native BLE PLX** - Bluetooth connectivity
- **React Native Chart Kit** - Data visualization

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Socket.IO** - Real-time server
- **bcrypt** - Password hashing
- **Axios** - HTTP client

### Hardware
- **ESP32** - Microcontroller
- **Arduino IDE** - Development environment
- **Edge Impulse** - ML model training
- **Libraries**: Adafruit, MAX30105, BLE

---

## 📚 Documentation

Mỗi thư mục chính có file README riêng:

| Folder | Documentation |
|--------|---------------|
| **Pet_Collar_Backend** | [Backend README](Pet_Collar_Backend/README.md) - API docs, setup |
| **Pet_Collar_App** | [App README](Pet_Collar_App/README.md) - Build & run instructions |
| **Hardware** | [Hardware README](Hardware/README.md) - Wiring, setup, troubleshooting |

---

## 🔄 Workflow

### 1️⃣ Device Setup
```
User registers in app
    ↓
User adds/scans Smart Collar (via MAC address)
    ↓
BLE connection established
    ↓
Device sends health data
```

### 2️⃣ Data Flow
```
ESP32 (Hardware)
    ↓ (BLE notify)
Mobile App
    ↓ (HTTP POST)
Backend Server
    ↓ (Socket.IO emit)
Mobile App (real-time)
    ↓
Notification Alert (if threshold exceeded)
```

### 3️⃣ Pet Sharing
```
Pet Owner: Creates Pet A
    ↓
Sends MAC address to Family Member
    ↓
Family Member: Joins Pet A
    ↓
Both can monitor same pet in real-time
```

---

## ⚙️ Environment Setup

### Backend (.env)
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/petdb
JWT_SECRET=your_secret_key_here
ALLOWED_ORIGIN=*
```

### App (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```

---

## 🧪 Testing

### Backend API
```bash
cd Pet_Collar_Backend
npm run dev
# Sử dụng Postman hoặc Thunder Client
```

### Mobile App
```bash
cd Pet_Collar_App
npm start
# Quét QR code hoặc dùng emulator
```

### Hardware
```bash
# Arduino IDE: Tools → Serial Monitor (9600 baud)
# Xem debug output từ ESP32
```

---

## 📊 Database Schema

Chính chủ là:
- **users** - Người dùng
- **pets** - Thú cưng
- **user_pets** - Liên kết nhiều-nhiều (sharing)
- **pet_health_logs** - Lịch sử sức khỏe
- **notifications** - Thông báo cảnh báo

Chi tiết xem [Backend README](Pet_Collar_Backend/README.md#cơ-sở-dữ-liệu)

---

## 🔒 Security Best Practices

✅ **Done:**
- JWT authentication
- Password hashing (bcrypt)
- CORS configuration
- Input validation
- Environment variables

⚠️ **Recommendations:**
- [ ] HTTPS in production
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] Database backups
- [ ] API key rotation

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not connecting to DB | Check DATABASE_URL, ensure PostgreSQL running |
| App can't connect to backend | Check EXPO_PUBLIC_API_URL, firewall |
| BLE not working | Check permissions in app.json, enable Bluetooth |
| Hardware won't upload | Hold BOOT button, check baud rate 115200 |
| Socket.IO events not received | Verify Socket.IO client configuration |

---

## 🚢 Deployment

### Backend Deployment
- ☁️ Heroku / Railway / Render
- 📊 Database: PostgreSQL cloud (AWS RDS, Neon, etc.)
- 🔐 Environment variables configured on host

### App Deployment
- 📱 iOS: TestFlight / App Store
- 🤖 Android: Google Play Store / Internal testing
- 🏗️ Build: `eas build` (Expo EAS)

### Hardware Deployment
- Upload firmware to ESP32
- Package into collar form factor
- Test battery life & BLE range

---

## 📈 Project Statistics

| Component | Lines of Code | Status |
|-----------|---------------|--------|
| Backend | ~500 | ✅ Core Complete |
| App | ~1000+ | ✅ Core Complete |
| Hardware | ~300 | ✅ Core Complete |
| Dataset | 1000+ samples | ✅ Ready |

---

## 📝 License

ISC License - Xem `LICENSE` file

---

## 👥 Contributors

- **Backend Team** - API development
- **Frontend Team** - Mobile app
- **Hardware Team** - Embedded systems
- **ML Team** - Model training & optimization

---

## 🔗 Links

- 📖 [Expo Documentation](https://docs.expo.dev/)
- 📖 [Express.js Documentation](https://expressjs.com/)
- 📖 [Arduino ESP32 Guide](https://docs.espressif.com/)
- 📖 [Edge Impulse](https://www.edgeimpulse.com/)
- 📱 [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ User authentication
- ✅ Health data collection
- ✅ Basic alerts
- ✅ Real-time updates

### Phase 2
- 📅 Advanced analytics
- 📅 Vet integration
- 📅 Community features
- 📅 Wearable device support

### Phase 3
- 🚀 Machine learning improvements
- 🚀 Multi-language support
- 🚀 Offline mode
- 🚀 Cloud synchronization

---

## 💬 Support & Contact

**Issues & Questions:**
- GitHub Issues: [Report bugs](../../issues)
- Documentation: See individual README files
- Contact: [Support Email]

---

**Project Start Date**: 2026  
**Latest Update**: May 2026  
**Version**: 1.0.0

🐾 **Happy Pet Monitoring!** 🐾
