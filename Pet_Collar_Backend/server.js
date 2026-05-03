require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Khởi tạo App
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));

// Khởi tạo Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigin } });

io.on('connection', (socket) => {
    console.log(`📱 Có một thiết bị kết nối Real-time (ID: ${socket.id})`);
    socket.on('disconnect', () => console.log(`📵 Thiết bị ${socket.id} đã ngắt kết nối.`));
});

// Gắn biến `io` vào `req` để các Router con có thể dùng được hàm emit()
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ==========================================
// KẾT NỐI ROUTER (API)
// ==========================================
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const healthRoutes = require('./routes/healthRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/health-logs', healthRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.json({ status: "success", message: "Chào mừng đến với Trạm điều khiển Pet Smart Collar!" });
});

// ==========================================
// KHỞI ĐỘNG SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy thành công tại port ${PORT}`);
});