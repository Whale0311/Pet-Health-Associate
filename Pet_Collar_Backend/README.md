# Pet Collar Backend API

Hệ thống backend cho ứng dụng Pet Smart Collar - một giải pháp thông minh theo dõi sức khỏe thú cưng trong thời gian thực thông qua thiết bị wearable gắn trên cổ thú cưng.

## 📋 Mục lục
- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Documentation](#api-documentation)
- [Socket.IO Events](#socketio-events)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [Xử lý lỗi](#xử-lý-lỗi)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## 🎯 Tổng quan

Pet Collar Backend là API REST xây dựng bằng Node.js và Express, cung cấp các dịch vụ để quản lý:
- **Xác thực người dùng**: Đăng ký, đăng nhập, thay đổi mật khẩu
- **Quản lý thú cưng**: Thêm, chỉnh sửa, xóa thông tin thú cưng
- **Theo dõi sức khỏe**: Lưu trữ và xử lý dữ liệu sức khỏe từ thiết bị
- **Hệ thống cảnh báo**: Tự động phát hiện và gửi thông báo khi phát hiện bất thường
- **Real-time Communication**: Cập nhật dữ liệu theo thời gian thực qua Socket.IO

---

## ✨ Tính năng chính

### 🔐 Xác thực (Authentication)
- Đăng ký người dùng mới với email
- Đăng nhập bằng email/mật khẩu
- JWT token-based authentication
- Thay đổi mật khẩu an toàn
- Bảo mật mật khẩu với bcrypt hashing

### 🐕 Quản lý thú cưng (Pet Management)
- Thêm thú cưng mới
- Theo dõi thú cưng của những người khác (join functionality)
- Cập nhật thông tin thú cưng
- Xóa/ngừng theo dõi thú cưng
- Xem lịch sử sức khỏe của thú cưng

### 💓 Theo dõi sức khỏe (Health Monitoring)
- Lưu trữ dữ liệu sức khỏe: nhịp tim, nhiệt độ, độ ẩm
- Mã hành vi (behavior codes): Nằm, chạy, đi bộ
- Xác thực dữ liệu hợp lý trước khi lưu
- Cảnh báo tự động dựa trên ngưỡng sức khỏe

### 🔔 Hệ thống thông báo (Notifications)
- Cảnh báo nhịp tim cao bất thường
- Cảnh báo nhiệt độ cao
- Cảnh báo nhịp tim tăng đột ngột
- Đánh dấu thông báo đã đọc
- Xem toàn bộ thông báo của người dùng

### 📡 Giao tiếp Real-time (Socket.IO)
- Cập nhật dữ liệu sức khỏe theo thời gian thực
- Gửi cảnh báo tức thì cho người dùng
- Theo dõi kết nối/ngắt kết nối thiết bị

---

## 🛠 Công nghệ sử dụng

| Công nghệ | Phiên bản | Mục đích |
|-----------|----------|---------|
| Node.js | Latest | JavaScript runtime |
| Express.js | ^5.2.1 | Web framework |
| PostgreSQL | Latest | Cơ sở dữ liệu relational |
| JWT (jsonwebtoken) | ^9.0.3 | Token-based authentication |
| bcrypt | ^6.0.0 | Password hashing |
| Socket.IO | ^4.8.3 | Real-time communication |
| CORS | ^2.8.6 | Cross-Origin Resource Sharing |
| dotenv | ^17.4.2 | Environment variable management |
| pg (node-postgres) | ^8.20.0 | PostgreSQL client for Node.js |
| Nodemon | ^3.1.14 | Development tool (auto-restart) |

---

## 📦 Cài đặt

### Yêu cầu trước
- **Node.js**: v14+ 
- **npm**: v6+
- **PostgreSQL**: v12+
- **Git**: Để clone repository

### Các bước cài đặt

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd Pet_Collar_Backend
   ```

2. **Cài đặt dependencies**
   ```bash
   npm install
   ```

3. **Tạo file `.env`**
   ```bash
   cp .env.example .env  # Nếu có file .env.example
   # hoặc tạo file .env mới
   ```

4. **Cấu hình biến môi trường** (xem phần bên dưới)

5. **Chạy migrations/setup database** (nếu có)
   ```bash
   # Tạo các bảng cần thiết trong database PostgreSQL
   ```

6. **Kiểm tra kết nối**
   ```bash
   npm start
   # Server sẽ xuất ra: ✅ Đã kết nối thành công với PostgreSQL!
   ```

---

## 🔧 Cấu hình biến môi trường

Tạo file `.env` trong thư mục gốc với các biến sau:

```env
# ===== Server Configuration =====
PORT=3000

# ===== Database Configuration =====
# Tùy chọn 1: Kết nối cục bộ (Docker)


# Tùy chọn 2: Kết nối Cloud (Neon, AWS RDS, etc.)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# ===== Security Configuration =====
JWT_SECRET=Chuoi_Bao_Mat
JWT_EXPIRE=30d

# ===== CORS Configuration =====
ALLOWED_ORIGIN=*
# Hoặc chỉ định domain cụ thể:
# ALLOWED_ORIGIN=http://localhost:8081,https://app.example.com
```

### Giải thích chi tiết các biến

| Biến | Mô tả | Ví dụ |
|------|--------|--------|
| `PORT` | Cổng máy chủ lắng nghe | `3000` |
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Khóa bí mật để ký JWT tokens | `Chuoi_bao_mat_phuc_tap_32_ky_tu` |
| `ALLOWED_ORIGIN` | Các nguồn được phép (CORS) | `*` hoặc `http://localhost:3000` |

> ⚠️ **Lưu ý**: Không commit file `.env` lên Git. Thêm nó vào `.gitignore`

---

## 📂 Cấu trúc dự án

```
Pet_Collar_Backend/
├── config/
│   └── db.js                    # Cấu hình kết nối PostgreSQL
├── middlewares/
│   └── auth.js                  # Middleware JWT authentication
├── routes/
│   ├── authRoutes.js           # API đăng ký, đăng nhập, thay đổi mật khẩu
│   ├── petRoutes.js            # API quản lý thú cưng
│   ├── healthRoutes.js         # API theo dõi sức khỏe
│   └── notificationRoutes.js   # API quản lý thông báo
├── server.js                    # Entry point chính, setup Express & Socket.IO
├── package.json                 # Project dependencies
├── .env                         # Biến môi trường (không commit lên Git)
├── .gitignore                   # Git ignore rules
└── README.md                    # Documentation này
```

### Mô tả từng file

| File | Mục đích |
|------|---------|
| `server.js` | Khởi tạo Express app, Socket.IO server, setup middlewares & routes |
| `config/db.js` | Kết nối PostgreSQL pool |
| `middlewares/auth.js` | Xác thực JWT token từ header Authorization |
| `routes/authRoutes.js` | Endpoints: register, login, change-password |
| `routes/petRoutes.js` | Endpoints: CRUD pets, join, health-logs |
| `routes/healthRoutes.js` | Endpoints: POST health data, auto-alerts |
| `routes/notificationRoutes.js` | Endpoints: GET notifications, mark as read |

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

---

### 🔐 Authentication Routes (`/api/auth`)

#### 1. **POST** `/api/auth/register`
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "full_name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "password123",
  "confirm_password": "password123"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Đăng ký thành công!",
  "data": {
    "user_id": 1,
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com"
  }
}
```

**Kiểm tra:**
- ✅ Email phải hợp lệ
- ✅ Mật khẩu xác nhận phải khớp
- ✅ Email chưa được sử dụng

---

#### 2. **POST** `/api/auth/login`
Đăng nhập tài khoản

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "user@example.com"
  }
}
```

**Lưu ý:**
- Token có hiệu lực 30 ngày
- Sử dụng token này trong header `Authorization: Bearer <token>` cho các request tiếp theo

---

#### 3. **PUT** `/api/auth/change-password`
Thay đổi mật khẩu (require authentication)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "old_password": "password123",
  "new_password": "new_password123",
  "confirm_new_password": "new_password123"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đổi mật khẩu thành công!"
}
```

---

### 🐕 Pet Routes (`/api/pets`)

#### 1. **POST** `/api/pets/`
Thêm thú cưng mới

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "name": "Milu",
  "gender": "male",
  "dob": "2022-05-15",
  "weight": 25.5,
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "image_url": "https://example.com/image.jpg"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Đã thêm thú cưng!",
  "data": {
    "pet_id": 1,
    "name": "Milu",
    "gender": "male",
    "dob": "2022-05-15",
    "weight": 25.5,
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "image_url": "https://example.com/image.jpg",
    "created_at": "2024-01-10T10:30:00Z"
  }
}
```

**Kiểm tra:**
- ✅ Name & mac_address bắt buộc
- ✅ MAC address phải duy nhất
- ✅ Ảnh mặc định nếu không cung cấp

---

#### 2. **GET** `/api/pets/`
Lấy danh sách thú cưng của người dùng

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "pet_id": 1,
      "name": "Milu",
      "gender": "male",
      "dob": "2022-05-15",
      "weight": 25.5,
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "image_url": "https://example.com/image.jpg",
      "created_at": "2024-01-10T10:30:00Z"
    }
  ]
}
```

---

#### 3. **PUT** `/api/pets/:id`
Cập nhật thông tin thú cưng

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "name": "Milu Updated",
  "weight": 26.0,
  "image_url": "https://example.com/new-image.jpg"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đã cập nhật thông tin!",
  "data": { /* updated pet data */ }
}
```

---

#### 4. **DELETE** `/api/pets/:id`
Xóa/ngừng theo dõi thú cưng

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đã xóa/ngừng theo dõi thú cưng thành công!"
}
```

**Hành vi:**
- Xóa liên kết giữa người dùng và thú cưng
- Nếu không ai theo dõi nữa, xóa hoàn toàn từ hệ thống

---

#### 5. **POST** `/api/pets/join`
Tham gia theo dõi thú cưng của người khác

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đã thêm thú cưng thành công!"
}
```

---

#### 6. **GET** `/api/pets/:id/health-logs`
Lấy 6 lần ghi nhật ký sức khỏe gần nhất

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "log_id": 1,
      "pet_id": 1,
      "behavior_code": 0,
      "heart_rate": 95,
      "temp_celsius": 38.5,
      "humidity": 65,
      "timestamp": "2024-01-10T15:30:00Z"
    }
  ]
}
```

---

### 💓 Health Routes (`/api/health-logs`)

#### 1. **POST** `/api/health-logs/`
Ghi nhật ký sức khỏe thú cưng (từ thiết bị)

**Request Body:**
```json
{
  "pet_id": 1,
  "behavior_code": 0,
  "heart_rate": 95,
  "temp_celsius": 38.5,
  "humidity": 65
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "log_id": 1,
    "pet_id": 1,
    "behavior_code": 0,
    "heart_rate": 95,
    "temp_celsius": 38.5,
    "humidity": 65,
    "timestamp": "2024-01-10T15:30:00Z"
  }
}
```

**Behavior Codes:**
```
0 = Nằm (Lying)
1 = Chạy (Running)
2 = Đi bộ (Walking)
```

**Ngưỡng cảnh báo tự động:**
- ⚠️ Nhịp tim > 140 bpm khi nằm → Cảnh báo sức khỏe khẩn cấp
- ⚠️ Nhiệt độ > 39.5°C → Cảnh báo nhiệt độ cao
- ⚠️ Nhịp tim > 160 bpm → Cảnh báo nhịp tim tăng

---

### 🔔 Notification Routes (`/api/notifications`)

#### 1. **GET** `/api/notifications/`
Lấy danh sách thông báo của người dùng

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "noti_id": 1,
      "user_id": 1,
      "pet_id": 1,
      "pet_name": "Milu",
      "title": "🚨 Cảnh báo Sức khỏe Khẩn cấp!",
      "message": "Nhịp tim cao bất thường trong lúc nghỉ ngơi.",
      "is_read": false,
      "created_at": "2024-01-10T15:30:00Z"
    }
  ]
}
```

---

#### 2. **PUT** `/api/notifications/read-all`
Đánh dấu tất cả thông báo đã đọc

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đã đọc toàn bộ thông báo"
}
```

---

#### 3. **PUT** `/api/notifications/:notiId/read`
Đánh dấu một thông báo cụ thể đã đọc

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Đã đọc thông báo"
}
```

---

## 📡 Socket.IO Events

Socket.IO được sử dụng để gửi dữ liệu real-time đến client.

### Server Events (từ Server gửi đến Client)

#### 1. **`new_health_data_{pet_id}`**
Sự kiện được emit khi có dữ liệu sức khỏe mới từ thiết bị

**Dữ liệu gửi:**
```json
{
  "log_id": 1,
  "pet_id": 1,
  "behavior_code": 0,
  "heart_rate": 95,
  "temp_celsius": 38.5,
  "humidity": 65,
  "timestamp": "2024-01-10T15:30:00Z"
}
```

**Cách lắng nghe (Client):**
```javascript
socket.on('new_health_data_1', (data) => {
  console.log('Dữ liệu sức khỏe mới:', data);
  // Cập nhật UI
});
```

---

#### 2. **`new_alert_user_{user_id}`**
Sự kiện được emit khi có thông báo cảnh báo mới

**Dữ liệu gửi:**
```json
{
  "noti_id": 1,
  "user_id": 1,
  "pet_id": 1,
  "title": "🚨 Cảnh báo Sức khỏe Khẩn cấp!",
  "message": "Nhịp tim cao bất thường trong lúc nghỉ ngơi.",
  "is_read": false,
  "created_at": "2024-01-10T15:30:00Z"
}
```

**Cách lắng nghe (Client):**
```javascript
socket.on('new_alert_user_1', (notification) => {
  console.log('Cảnh báo mới:', notification);
  // Hiển thị cảnh báo
});
```

---

#### 3. **Connection Events**
```javascript
// Khi thiết bị kết nối
socket.on('connection', () => {
  console.log(`📱 Có một thiết bị kết nối Real-time (ID: ${socket.id})`);
});

// Khi thiết bị ngắt kết nối
socket.on('disconnect', () => {
  console.log(`📵 Thiết bị ${socket.id} đã ngắt kết nối.`);
});
```

---

## 🗄️ Cơ sở dữ liệu

### Schema (bảng chính)

#### 1. **users**
```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **pets**
```sql
CREATE TABLE pets (
  pet_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(50),
  dob DATE,
  weight DECIMAL(5, 2),
  mac_address VARCHAR(17) UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **user_pets** (Many-to-Many)
```sql
CREATE TABLE user_pets (
  user_pet_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id INT NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, pet_id)
);
```

#### 4. **pet_health_logs**
```sql
CREATE TABLE pet_health_logs (
  log_id SERIAL PRIMARY KEY,
  pet_id INT NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
  behavior_code INT (0=Lying, 1=Running, 2=Walking),
  heart_rate INT,
  temp_celsius DECIMAL(4, 2),
  humidity DECIMAL(5, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **notifications**
```sql
CREATE TABLE notifications (
  noti_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id INT NOT NULL REFERENCES pets(pet_id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ▶️ Chạy ứng dụng

### Development Mode (với auto-reload)
```bash
npm run dev
```

Output:
```
✅ Đã kết nối thành công với PostgreSQL!
🚀 Server đang chạy thành công tại port 3000
```

### Production Mode
```bash
npm start
```

### Testing API

#### Sử dụng Postman
1. Mở Postman
2. Import collection (nếu có)
3. Set environment variables
4. Chạy các request

#### Sử dụng curl
```bash
# Test GET root
curl http://localhost:3000/

# Test Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "confirm_password": "password123"
  }'
```

#### Sử dụng Thunder Client hoặc REST Client
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

---

## ❌ Xử lý lỗi

### Status Codes

| Code | Ý nghĩa |
|------|---------|
| 200 | OK - Request thành công |
| 201 | Created - Tài nguyên được tạo thành công |
| 400 | Bad Request - Dữ liệu không hợp lệ |
| 401 | Unauthorized - Cần xác thực (thiếu/sai token) |
| 403 | Forbidden - Token không hợp lệ/hết hạn |
| 404 | Not Found - Tài nguyên không tồn tại |
| 500 | Internal Server Error - Lỗi máy chủ |

### Response Format

**Success:**
```json
{
  "status": "success",
  "message": "...",
  "data": { /* ... */ }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Mô tả lỗi chi tiết"
}
```

### Common Errors

#### 1. Lỗi JWT
```json
{
  "status": "error",
  "message": "Yêu cầu xác thực! Vui lòng đăng nhập."
}
```
**Giải pháp:** Đăng nhập lại và lấy token mới

#### 2. Lỗi Database Connection
```
❌ Lỗi kết nối CSDL: [error message]
```
**Giải pháp:** Kiểm tra DATABASE_URL, đảm bảo PostgreSQL chạy

#### 3. Lỗi CORS
```
Access to XMLHttpRequest blocked by CORS policy
```
**Giải pháp:** Kiểm tra ALLOWED_ORIGIN trong .env

#### 4. Dữ liệu Validation
```json
{
  "status": "error",
  "message": "Nhiễu dữ liệu."
}
```
**Giải pháp:** 
- heart_rate: 0-300 bpm
- temp_celsius: 10-50°C

---

## 🔍 Troubleshooting

### Vấn đề: Server không khởi động

**Triệu chứng:**
```
Error: listen EADDRINUSE :::3000
```

**Giải pháp:**
```bash
# Tìm process sử dụng port 3000
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F

# Hoặc đổi port trong .env
PORT=3001
```

---

### Vấn đề: Không kết nối được Database

**Triệu chứng:**
```
❌ Lỗi kết nối CSDL: ECONNREFUSED
```

**Giải pháp:**
1. Kiểm tra PostgreSQL đang chạy
2. Kiểm tra DATABASE_URL trong .env
3. Kiểm tra username/password
4. Kiểm tra firewall

---

### Vấn đề: JWT Token không hợp lệ

**Triệu chứng:**
```json
{
  "status": "error",
  "message": "Token không hợp lệ hoặc đã hết hạn!"
}
```

**Giải pháp:**
1. Token hết hạn → Đăng nhập lại
2. Token sai format → Sử dụng format `Bearer <token>`
3. JWT_SECRET thay đổi → Các token cũ không còn hợp lệ

---

### Vấn đề: CORS Error

**Triệu chứng:**
```
Access to XMLHttpRequest from origin '...' blocked by CORS
```

**Giải pháp:**
```env
# Cho phép all origins
ALLOWED_ORIGIN=*

# Hoặc chỉ định origins cụ thể
ALLOWED_ORIGIN=http://localhost:3000,http://localhost:8081
```

---

## 📚 Tài liệu tham khảo

### Các thư viện sử dụng
- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [node-postgres (pg)](https://node-postgres.com/)

### Công cụ hữu ích
- [Postman API Testing](https://www.postman.com/)
- [Thunder Client](https://www.thunderclient.com/)
- [pgAdmin - PostgreSQL GUI](https://www.pgadmin.org/)
- [DBeaver - Database Tool](https://dbeaver.io/)

---

## 📝 Ghi chú quan trọng

### 🔒 Bảo mật
- ✅ Luôn lưu `.env` private (thêm vào `.gitignore`)
- ✅ Sử dụng HTTPS trong production
- ✅ Thay đổi `JWT_SECRET` mạnh mẽ
- ✅ Validate tất cả input từ client
- ✅ Sử dụng SSL khi kết nối database

### 📈 Scaling & Performance
- ✅ Sử dụng database connection pooling
- ✅ Thêm caching nếu cần
- ✅ Monitor performance metrics
- ✅ Sử dụng load balancer cho production

### 🧪 Testing
- Viết unit tests cho middlewares
- Viết integration tests cho routes
- Test socket.io events
- Load testing trước deployment

---

## 👥 Support & Contact

Nếu có vấn đề hoặc câu hỏi, vui lòng:
- Tạo Issue trên GitHub
- Liên hệ team development
- Kiểm tra logs: `console.log()` output

---

## 📄 License

ISC License - Xem file LICENSE để biết chi tiết

---

**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: Tháng 1, 2024