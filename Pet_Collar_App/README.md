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
- 🐕 **Quản lý thú cưng**: Thêm, xem danh sách pets
- 💓 **Theo dõi sức khỏe**: Nhịp tim, nhiệt độ, độ ẩm real-time
- 📊 **Biểu đồ**: Visualize dữ liệu sức khỏe
- 🔔 **Thông báo**: Cảnh báo khi phát hiện bất thường
- 📍 **Vị trí**: Xem vị trí thú cưng (nếu có GPS)
- 🔗 **Bluetooth**: Kết nối trực tiếp với Smart Collar
- 🌐 **Real-time**: Socket.IO updates

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

## 📋 Key Dependencies

- **@react-navigation/native** - Navigation library
- **react-native-ble-plx** - Bluetooth Low Energy
- **socket.io-client** - Real-time communication
- **react-native-chart-kit** - Charts & graphs
- **expo-location** - GPS location
- **expo-notifications** - Push notifications
- **@react-native-async-storage/async-storage** - Local storage

## 🔧 Linting

```bash
npm run lint
```

## 📚 File-based Routing

App sử dụng [Expo Router](https://docs.expo.dev/router/introduction/) với file-based routing:

- `app/(tabs)/` - Main tabs (home, pets, notifications, profile)
- `app/pet/[id]/` - Dynamic pet detail page
- `app/modal.tsx` - Modal screens

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

**Lỗi: API connection failed**
- Kiểm tra backend đang chạy (port 3000)
- Kiểm tra `.env` configuration
- Kiểm tra network connectivity

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
