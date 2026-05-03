// 1. THƯ VIỆN AI
#include <Pet_Behavior_Tracker_inferencing.h> // LƯU Ý: SỬA LẠI ĐÚNG TÊN FILE ZIP CỦA BẠN NẾU CẦN

// 2. THƯ VIỆN BLUETOOTH
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// 3. THƯ VIỆN CẢM BIẾN
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_SHT31.h>
#include <MAX30105.h>
#include <heartRate.h>

// --- KHỞI TẠO ĐỐI TƯỢNG CẢM BIẾN ---
Adafruit_MPU6050 mpu;
Adafruit_SHT31 sht31 = Adafruit_SHT31();
MAX30105 particleSensor;

// --- BIẾN BLUETOOTH ---
BLEServer* pServer = NULL;
BLECharacteristic* pBehaviorChar = NULL;
BLECharacteristic* pHeartRateChar = NULL;
BLECharacteristic* pTempChar = NULL;
BLECharacteristic* pHumidityChar = NULL; // Thêm biến cho Độ ẩm

bool deviceConnected = false;
bool oldDeviceConnected = false;

// --- BẢNG UUID ĐÃ CẬP NHẬT ---
#define SERVICE_UUID           "19B10000-E8F2-537E-4F6C-D104768A1214"
#define BEHAVIOR_CHAR_UUID     "19B10001-E8F2-537E-4F6C-D104768A1214"
#define HEARTRATE_CHAR_UUID    "19B10002-E8F2-537E-4F6C-D104768A1214"
#define TEMPERATURE_CHAR_UUID  "19B10003-E8F2-537E-4F6C-D104768A1214"
#define HUMIDITY_CHAR_UUID     "19B10004-E8F2-537E-4F6C-D104768A1214" // Thêm UUID Độ ẩm

// --- BIẾN NHỊP TIM ---
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

// Task Handle cho FreeRTOS
TaskHandle_t VitalsTask;

// --- CALLBACK BLUETOOTH ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("App Android đã kết nối!");
    };
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("App Android đã ngắt kết nối!");
    }
};

// =========================================================================
// NHIỆM VỤ LÕI 0: ĐỌC NHỊP TIM, NHIỆT ĐỘ & ĐỘ ẨM LIÊN TỤC
// =========================================================================
void vitalsTaskCode( void * pvParameters ) {
    long lastEnvRead = 0;

    for(;;) { // Vòng lặp vô hạn của Lõi 0
        // 1. Quét nhịp tim MAX30102
        long irValue = particleSensor.getIR();
        if(irValue <50000){
            if(deviceConnected){
                uint8_t hr = 0;
                pHeartRateChar->setValue(&hr, 1);
                pHeartRateChar->notify();
            }
        }else{
            if (checkForBeat(irValue) == true) {
                long delta = millis() - lastBeat;
                lastBeat = millis();
                beatsPerMinute = 60 / (delta / 1000.0);

                if (beatsPerMinute < 255 && beatsPerMinute > 20) {
                    rates[rateSpot++] = (byte)beatsPerMinute;
                    rateSpot %= RATE_SIZE;
                    beatAvg = 0;
                    for (byte x = 0 ; x < RATE_SIZE ; x++) beatAvg += rates[x];
                    beatAvg /= RATE_SIZE;

                    // Gửi Notify qua BLE ngay khi có nhịp tim mới
                    if(deviceConnected) {
                        uint8_t hr = (uint8_t)beatAvg;
                        pHeartRateChar->setValue(&hr, 1);
                        pHeartRateChar->notify();
                    }
                }
            }
        }

        // 2. Đọc môi trường (Nhiệt độ & Độ ẩm) mỗi 2 giây
        if (millis() - lastEnvRead > 2000) {
            float t = sht31.readTemperature();
            float h = sht31.readHumidity(); // Đọc thêm độ ẩm

            if (deviceConnected) {
                // Gửi Nhiệt độ
                if (!isnan(t)) {
                    String tempStr = String(t, 1);
                    pTempChar->setValue(tempStr.c_str());
                    pTempChar->notify();
                }
                
                // Gửi Độ ẩm
                if (!isnan(h)) {
                    String humStr = String(h, 1);
                    pHumidityChar->setValue(humStr.c_str());
                    pHumidityChar->notify();
                }
            }
            lastEnvRead = millis();
        }

        // Nhường CPU cho hệ thống xử lý Wifi/BLE (Tránh lỗi Watchdog)
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
}

// =========================================================================
// SETUP HỆ THỐNG CHÍNH
// =========================================================================
void setup() {
    Serial.begin(115200);
    Wire.begin(); 

    // 1. Khởi tạo Cảm biến
    if (!mpu.begin()) Serial.println("LỖI: MPU6050!");
    else { mpu.setAccelerometerRange(MPU6050_RANGE_4_G); mpu.setFilterBandwidth(MPU6050_BAND_21_HZ); }

    if (!sht31.begin(0x44)) Serial.println("LỖI: SHT31!");

    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) Serial.println("LỖI: MAX30102!");
    else {
        particleSensor.setup();
        particleSensor.setPulseAmplitudeRed(0x0A);
        particleSensor.setPulseAmplitudeGreen(0);
    }

    // 2. Khởi tạo BLE Server & Các Đặc tính (Characteristics)
    BLEDevice::init("Pet_Smart_Collar");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // AI Behavior (Mã hóa số)
    pBehaviorChar = pService->createCharacteristic(BEHAVIOR_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
    pBehaviorChar->addDescriptor(new BLE2902());
    
    // Heart Rate
    pHeartRateChar = pService->createCharacteristic(HEARTRATE_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
    pHeartRateChar->addDescriptor(new BLE2902());
    
    // Temperature
    pTempChar = pService->createCharacteristic(TEMPERATURE_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
    pTempChar->addDescriptor(new BLE2902());
    
    // Humidity (Mới thêm)
    pHumidityChar = pService->createCharacteristic(HUMIDITY_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
    pHumidityChar->addDescriptor(new BLE2902());

    pService->start();
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x0);
    BLEDevice::startAdvertising();

    // 3. Kích hoạt Lõi 0
    xTaskCreatePinnedToCore(vitalsTaskCode, "VitalsTask", 10000, NULL, 1, &VitalsTask, 0);
    
    Serial.println("\nHỆ THỐNG ĐÃ SẴN SÀNG! ĐANG PHÁT SÓNG BLE...");
}

// =========================================================================
// NHIỆM VỤ LÕI 1: CHẠY AI INFERENCING MPU6050
// =========================================================================
void loop() {
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); pServer->startAdvertising(); oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected && !oldDeviceConnected) oldDeviceConnected = deviceConnected;

    // --- THU THẬP DỮ LIỆU ---
    float buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE] = { 0 };
    for (size_t ix = 0; ix < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE; ix += 3) {
        uint64_t next_tick = micros() + (EI_CLASSIFIER_INTERVAL_MS * 1000);
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);

        buffer[ix + 0] = a.acceleration.x / 9.80665;
        buffer[ix + 1] = a.acceleration.y / 9.80665;
        buffer[ix + 2] = a.acceleration.z / 9.80665;

        long wait_time = next_tick - micros();
        if(wait_time > 0) delayMicroseconds(wait_time);
    }

    // --- CHẠY AI ---
    signal_t signal;
    numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
    ei_impulse_result_t result = { 0 };
    run_classifier(&signal, &result, false);

    // --- TÌM & GỬI HÀNH VI (MÃ HÓA SỐ) ---
    float max_val = 0.0;
    uint8_t behavior_code = 0;
    String best_label = "";

    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
        if (result.classification[ix].value > max_val) {
            max_val = result.classification[ix].value;
            behavior_code = ix; 
            best_label = result.classification[ix].label;
        }
    }

    if (deviceConnected) {
        pBehaviorChar->setValue(&behavior_code, 1);
        pBehaviorChar->notify();
        
        Serial.print("Trạng thái AI: ");
        Serial.print(best_label);
        Serial.print(" (Mã: ");
        Serial.print(behavior_code);
        Serial.println(")");
    }
}