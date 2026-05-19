# Pet Collar App 🐕

Ứng dụng mobile theo dõi sức khỏe thú cưng theo thời gian thực thông qua kết nối Bluetooth với thiết bị Smart Collar.

## 📱 Yêu cầu

- Node.js v14+
- npm v6+
- Android Studio / Xcode (để build)
- Expo CLI: `npm install -g expo-cli`

## 🚀 Cài đặt & Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm start

# Build Android
npm run android

# Build iOS
npm run ios

# Build Web
npm run web
```

Sau khi chạy `npm start`, bạn có thể:
- Quét QR code bằng **Expo Go** app
- Chọn emulator (Android/iOS)
- Chạy trên web browser

## 📂 Cấu trúc Folder

```
Pet_Collar_App/
├── app/                    # Routing & Pages (file-based)
│   ├── (tabs)/            # Tab navigation screens
│   ├── pet/               # Pet detail screens
│   └── modal.tsx          # Modal components
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── constants/             # App constants & config
├── assets/               # Images & fonts
└── app.json              # Expo configuration
```

## ✨ Tính năng chính

- 🔐 **Xác thực**: Đăng ký/Đăng nhập qua backend
- 🐕 **Quản lý thú cưng**: Thêm, xem, chỉnh sửa danh sách pets
- 💓 **Theo dõi sức khỏe Real-time**: Nhịp tim, nhiệt độ, độ ẩm qua Bluetooth
- 📊 **Biểu đồ**: Visualize dữ liệu sức khỏe với BarChart
- 🤖 **AI Health Alerts**: Nhận cảnh báo thông báo thông minh từ AI backend
- 🔔 **Quản lý Thông báo**: 
  - Xem danh sách thông báo
  - Đánh dấu thông báo đã đọc
  - **Xóa thông báo cụ thể** ✨ NEW
  - Đếm số lượng thông báo chưa đọc
- 🚀 **Background Sync Service**: Tự động đồng bộ dữ liệu sức khỏe lên server ngay cả khi app chạy nền ✨ NEW
- 🔗 **Bluetooth**: Kết nối trực tiếp với Smart Collar (BLE)
- 🌐 **Real-time Updates**: Socket.IO để cập nhật dữ liệu tức thì
- 📍 **Vị trí**: Xem vị trí thú cưng (GPS support)

## 🛠 Công nghệ

| Công nghệ | Mục đích |
|-----------|---------|
| React Native | Mobile framework |
| Expo | Cross-platform development |
| TypeScript | Type safety |
| Expo Router | File-based routing |
| React Navigation | Navigation |
| React Native BLE PLX | Bluetooth communication |
| Socket.IO | Real-time updates |
| Axios | HTTP client |
| Chart Kit | Data visualization |

## 🔑 Biến môi trường

Tạo file `.env` tại root:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```

## 🚀 Background Sync Service ✨ NEW

Ứng dụng có khả năng đồng bộ dữ liệu sức khỏe tự động ngay cả khi app chạy nền.

### Cách thức hoạt động:

1. **BLE Data Buffering**: Thu thập dữ liệu từ thiết bị Bluetooth thành một buffer
2. **Periodic Sync**: Mỗi 10 giây, gửi dữ liệu lên backend nếu có thay đổi
3. **Task Manager**: Sử dụng Expo Task Manager để giữ JS thread sống
4. **Anti-spam Protection**: Chỉ gửi dữ liệu nếu nhịp tim > 0 và nhiệt độ > 0

### Code Implementation:

```typescript
// app/pet/[id].tsx

const processBackgroundSync = async () => {
  const now = Date.now();
  
  // Chỉ gửi dữ liệu lên Server nếu đã trôi qua ít nhất 10 giây
  if (now - lastSyncTime.current >= 10000) {
    const { hr, temp, behavior } = bleDataRef.current;
    
    if (hr > 0 && temp > 0) {
      lastSyncTime.current = now;
      
      const response = await axios.post(
        'https://pet-collar-backend.onrender.com/api/health-logs', 
        {
          pet_id: petId,
          behavior_code: behavior,
          heart_rate: hr,
          temp_celsius: temp,
          humidity: 60
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
  }
};
```

### Task Manager Setup:

```typescript
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_BLE_TASK = 'BACKGROUND_BLE_TASK';

TaskManager.defineTask(BACKGROUND_BLE_TASK, async () => {
  // Keeping JS Thread Alive 🚀
});
```

---

## 🔔 Notification Management ✨ NEW

### Tính năng Thông báo:

- **Xem danh sách**: Lấy tất cả thông báo của người dùng từ backend
- **Đánh dấu đã đọc**: Cập nhật trạng thái `is_read` trên server
- **Xóa thông báo**: Xóa một thông báo cụ thể (chỉ người sở hữu mới có thể)
- **Unread Count**: Đếm số lượng thông báo chưa đọc
- **Swipeable UI**: Dùng gesture handler để swipe xóa thông báo

### API Endpoints:

```typescript
// Lấy danh sách thông báo
GET /api/notifications

// Đánh dấu một thông báo đã đọc
PUT /api/notifications/:notiId/read

// Xóa một thông báo ✨ NEW
DELETE /api/notifications/:id

// Đánh dấu tất cả đã đọc
PUT /api/notifications/read-all
```

### Socket.IO Events:

```typescript
// Listen for new alert notifications
socket.on('new_alert_user_{userId}', (notification) => {
  // Update app state with new notification
  setNotifications([notification, ...notifications]);
  setUnreadCount(unreadCount + 1);
});

// Listen for health data updates
socket.on('new_health_data_{petId}', (healthData) => {
  // Update health dashboard
  setHeartRate(healthData.heart_rate);
  setTemperature(healthData.temp_celsius);
});
```

---

## 📋 Key Dependencies

- **@react-navigation/native** - Navigation library
- **react-native-ble-plx** - Bluetooth Low Energy
- **socket.io-client** - Real-time communication
- **react-native-chart-kit** - Charts & graphs
- **expo-location** - GPS location
- **expo-notifications** - Push notifications
- **expo-task-manager** - Background task execution ✨ NEW
- **@react-native-async-storage/async-storage** - Local storage
- **react-native-gesture-handler** - Swipeable notifications ✨ NEW

## 🔧 Linting

```bash
npm run lint
```

## 📚 File-based Routing

App sử dụng [Expo Router](https://docs.expo.dev/router/introduction/) với file-based routing:

- `app/(tabs)/` - Main tabs navigation
  - `home.tsx` - Danh sách thú cưng, Socket.IO setup, Notification badge ✨ NEW
  - `explore.tsx` - Khám phá & settings
  - `index.tsx` - Tab navigation
- `app/pet/[id]/` - Dynamic pet detail page (Background Sync Service) ✨ NEW
- `app/modal.tsx` - Modal screens

### Key Screen Components:

**home.tsx** - Main hub
- Socket.IO connection listener
- Pet list with device status
- **Notification management UI** ✨ NEW
- Profile menu

**app/pet/[id].tsx** - Pet Dashboard
- Real-time BLE data display
- **Background sync processor** ✨ NEW
- Health history chart
- Edit pet info modal

## 🐛 Troubleshooting

**Lỗi: "Unable to resolve dependency"**
```bash
npm install
expo doctor
```

**Lỗi: Bluetooth không kết nối**
- Kiểm tra permissions trong `app.json`
- Bật Bluetooth trên thiết bị
- Reset Bluetooth module

**Lỗi: Background Sync không hoạt động** ✨
- Kiểm tra API_URL trong `.env`
- Đảm bảo backend đang chạy
- Kiểm tra token JWT còn hợp lệ
- Kiểm tra logs trong `processBackgroundSync()`

**Lỗi: Thông báo không xuất hiện**
- Kiểm tra Socket.IO connection trên home screen
- Đảm bảo `expo-notifications` được cấu hình trong `app.json`
- Kiểm tra permission notifications từ backend

**Lỗi: API connection failed**
- Kiểm tra backend đang chạy (port 3000)
- Kiểm tra `.env` configuration
- Kiểm tra network connectivity
- Kiểm tra CORS headers từ backend

**Lỗi: Swipeable Notifications không hoạt động** ✨
- Đảm bảo `react-native-gesture-handler` đã được setup đúng
- Wrap component trong `GestureHandlerRootView`
- Kiểm tra React Native Reanimated version

## 📖 Tài liệu

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

## 🎯 Scripts

| Script | Mục đích |
|--------|---------|
| `npm start` | Run development server |
| `npm run android` | Build Android app |
| `npm run ios` | Build iOS app |
| `npm run web` | Run on web browser |
| `npm run lint` | Check code quality |
| `npm run reset-project` | Reset to fresh state |

---

**Version**: 1.0.0  
**Built with**: Expo & React Native
