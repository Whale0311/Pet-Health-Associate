/* Includes ---------------------------------------------------------------- */
// CHÚ Ý: Hãy đảm bảo tên thư viện AI này khớp đúng với tên file zip bạn đã tải về
#include <Pet_Behavior_Tracker_inferencing.h> 

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

/* Khởi tạo đối tượng MPU6050 */
Adafruit_MPU6050 mpu;

/* Biến cấu hình AI */
static bool debug_nn = false; // Bật true nếu muốn xem log chi tiết của mạng nơ-ron

void setup()
{
    Serial.begin(115200);
    while (!Serial);
    Serial.println("\n--- Khởi động ESP32 Pet Behavior AI ---");

    // Khởi tạo giao tiếp I2C cho MPU6050
    if (!mpu.begin()) {
        Serial.println("LỖI: Không tìm thấy MPU6050! Vui lòng kiểm tra lại dây cắm SDA/SCL.");
        while (1) {
            delay(10); // Dừng chương trình nếu lỗi phần cứng
        }
    }
    Serial.println("MPU6050 khởi tạo thành công!");

    // Cấu hình tầm đo cho MPU6050 (Tùy chọn: ±2G, ±4G, ±8G, ±16G)
    // Edge Impulse thường train với dữ liệu đã chuẩn hóa (thường là m/s^2), 
    // +-4G là một dải đo hợp lý cho chuyển động của chó.
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

    if (EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME != 3) {
        ei_printf("LỖI: AI Model này không dùng 3 trục cảm biến! Vui lòng kiểm tra lại thiết kế trên web.\n");
        return;
    }
}

void loop()
{
    ei_printf("\nĐang lấy mẫu dữ liệu (%d ms)...\n", EI_CLASSIFIER_INTERVAL_MS * (EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE / 3));

    // Cấp phát một bộ đệm (Array) để chứa dữ liệu 2 giây (tùy vào Window Size bạn set trên web)
    float buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE] = { 0 };

    // Vòng lặp lấy mẫu dữ liệu từ MPU6050
    for (size_t ix = 0; ix < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE; ix += 3) {
        // Tính toán thời gian cho chu kỳ lấy mẫu tiếp theo
        uint64_t next_tick = micros() + (EI_CLASSIFIER_INTERVAL_MS * 1000);

        // Đọc dữ liệu từ cảm biến
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);

        // Nạp dữ liệu gia tốc (theo đơn vị m/s^2) vào bộ đệm của AI
        // Nạp dữ liệu gia tốc vào bộ đệm của AI
        // Chia cho 9.80665 để chuyển từ m/s^2 sang đơn vị G cho khớp với mô hình
        buffer[ix + 0] = a.acceleration.x / 9.80665;
        buffer[ix + 1] = a.acceleration.y / 9.80665; 
        buffer[ix + 2] = a.acceleration.z / 9.80665;

        // Chờ đến chu kỳ lấy mẫu tiếp theo (để đảm bảo tần số 100Hz đúng như lúc train)
        delayMicroseconds(next_tick - micros());
    }

    // Chuyển đổi bộ đệm thô thành cấu trúc Tín hiệu (Signal) mà AI hiểu được
    signal_t signal;
    int err = numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
    if (err != 0) {
        ei_printf("LỖI: Không thể chuyển đổi tín hiệu (%d)\n", err);
        return;
    }

    // -----------------------------------------------------
    // CHẠY BỘ NÃO AI (CLASSIFIER)
    // -----------------------------------------------------
    ei_impulse_result_t result = { 0 };

    err = run_classifier(&signal, &result, debug_nn);
    if (err != EI_IMPULSE_OK) {
        ei_printf("LỖI: AI không thể tính toán (%d)\n", err);
        return;
    }

    // IN KẾT QUẢ RA MÀN HÌNH
    ei_printf("=== KẾT QUẢ DỰ ĐOÁN ===\n");
    ei_printf("Thời gian xử lý: DSP %d ms | AI %d ms\n", result.timing.dsp, result.timing.classification);
    
    // Duyệt qua 4 nhãn hành vi và in ra xác suất %
    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
        ei_printf(" * %s: %.2f %%\n", result.classification[ix].label, result.classification[ix].value * 100.0);
    }
}