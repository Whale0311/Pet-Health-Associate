Pet Collar IoT - Phân hệ Phần cứng (Hardware)
Đây là phân hệ thiết bị nhúng (Embedded System) của dự án Vòng cổ theo dõi sức khỏe thú cưng. Phân hệ này chịu trách nhiệm thu thập dữ liệu sinh hiệu, phân tích hành vi bằng Trí tuệ nhân tạo (Edge AI) và truyền dữ liệu theo thời gian thực tới Ứng dụng di động thông qua chuẩn giao tiếp Bluetooth Low Energy (BLE).

🌟 Tính năng cốt lõi
Đo lường Sinh hiệu: Đọc dữ liệu nhịp tim (Heart Rate) và nhiệt độ cơ thể (Body Temperature) liên tục.

Phân tích Hành vi (Edge AI): Sử dụng mô hình Machine Learning được huấn luyện trên Edge Impulse để phân loại 4 trạng thái hành vi: Idle (Nghỉ ngơi), Playing (Đang chơi), Trotting (Chạy kiệu), Walking (Đang đi).

Giao tiếp BLE Tiết kiệm Năng lượng: Thiết lập làm BLE Server, phát sóng dữ liệu liên tục để điện thoại thu thập mà không cần duy trì kết nối WiFi, giúp tối ưu hóa thời lượng pin cho vòng cổ.

Định danh Thông minh: Quá trình quét và thêm thiết bị mới vào ứng dụng được thực hiện thông qua việc nhận diện trực tiếp Tên/ID duy nhất (Unique Name/ID) của mạch ESP32, mang lại trải nghiệm kết nối liền mạch mà không cần nút bấm vật lý trên vòng cổ.

🛠️ Yêu cầu Phần cứng & Linh kiện
Vi điều khiển: ESP32 (Tích hợp sẵn Bluetooth/BLE).

Cảm biến chuyển động: MPU6050 (Gia tốc kế & Con quay hồi chuyển) để lấy dữ liệu raw cho mô hình AI.

Cảm biến sinh hiệu: (Các module cảm biến Nhịp tim & Nhiệt độ tương thích như MAX30102 hoặc tương đương).

Nguồn cấp: Pin Li-po và mạch sạc/bảo vệ pin.

📂 Cấu trúc Thư mục
Plaintext
Hardware/
├── Hardware.ino          # File mã nguồn chính của mạch ESP32
├── TestMPU/              # Mã nguồn test cảm biến gia tốc (Calibration)
├── Test_AI_MPU/          # Mã nguồn test suy luận mô hình AI nội bộ
└── README.md             # Tài liệu bạn đang đọc
📡 Cấu hình Giao thức BLE (Bluetooth Low Energy)
Mạch ESP32 phát sóng một Service chứa 3 Characteristics độc lập để phân loại luồng dữ liệu. Dữ liệu được mã hóa trước khi truyền đi.

Service UUID: 19b10000-e8f2-537e-4f6c-d104768a1214

Characteristics:

19b10001-...: Mã hành vi (Behavior Code: 0, 1, 2, 3)

19b10002-...: Nhịp tim (Heart Rate - bpm)

19b10003-...: Nhiệt độ (Temperature - °C)

🚀 Hướng dẫn Cài đặt & Nạp code
1. Cài đặt Môi trường
Cài đặt Arduino IDE (hoặc PlatformIO trên VS Code).

Thêm gói thư viện hỗ trợ board ESP32 vào Boards Manager.

2. Cài đặt Thư viện
Bạn cần cài đặt các thư viện sau thông qua Library Manager (hoặc file .zip tải về):

Thư viện giao tiếp I2C và cảm biến: Adafruit MPU6050, Adafruit Unified Sensor.

Thư viện BLE: BLEDevice, BLEServer, BLEUtils, BLE2902.

Thư viện Edge AI (Quan trọng): Tải file nén ei-pet_behavior_tracker-arduino-1.0.1.zip (xuất từ Edge Impulse Studio). Trong Arduino IDE, chọn Sketch -> Include Library -> Add .ZIP Library... và trỏ tới file nén này.

3. Biên dịch và Nạp (Flash)
Kết nối mạch ESP32 với máy tính qua cáp USB Type-C/Micro-USB.

Mở file Hardware.ino.

Chọn đúng cổng COM và Board ESP32 Dev Module.

Bấm nút Upload. Nếu mạch có nút BOOT, hãy nhấn giữ nút BOOT trên mạch khi màn hình hiện chữ Connecting... để bắt đầu nạp.

⚠️ Lưu ý khi phát triển
Tần số lấy mẫu (Sampling Rate) của MPU6050 trong code ESP32 phải khớp tuyệt đối với tần số đã sử dụng khi huấn luyện mô hình trên Edge Impulse để AI nhận diện chính xác.

Tránh sử dụng hàm delay() trong vòng lặp chính loop(). Hãy sử dụng cơ chế millis() để không làm gián đoạn quá trình gửi dữ liệu BLE và suy luận AI.