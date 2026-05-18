const fs = require('fs');

// Cấu trúc: heart_rate, temp_celsius, behavior_code, alert_level (0: Normal, 1: Warning, 2: Danger)
let csvContent = "heart_rate,temp_celsius,behavior_code,alert_level\n";

for (let i = 0; i < 5000; i++) {
    // Random cơ bản
    let hr = Math.floor(Math.random() * (220 - 50 + 1)) + 50; 
    let temp = (Math.random() * (41.5 - 35.0) + 35.0).toFixed(1);
    let behavior = Math.floor(Math.random() * 4); // 0: Idle, 1: Playing, 2: Trotting, 3: Walking
    
    let alert = 0; // Mặc định là bình thường

    // Bơm logic y khoa vào để dán nhãn (Labeling)
    if (temp > 39.5 || temp < 36.0) {
        alert = 2; // Sốc nhiệt / Hạ thân nhiệt khẩn cấp
    } else if (temp > 38.5) {
        alert = 1; // Sốt nhẹ / Cảnh báo
    }

    if (alert !== 2) {
        if (behavior === 0 && hr > 140) {
            alert = 2; // Nằm im nhưng tim đập quá nhanh (Nguy hiểm)
        } else if (behavior === 0 && hr > 120) {
            alert = 1; // Cảnh báo nhịp tim
        } else if ((behavior === 1 || behavior === 2) && hr > 180) {
            alert = 1; // Chơi đùa rát / Chạy nhanh quá sức
        } else if ((behavior === 1 || behavior === 2) && hr > 200) {
            alert = 2; // Quá ngưỡng chịu đựng
        } else if (hr < 60) {
            alert = 2; // Nhịp tim quá thấp
        }
    }

    csvContent += `${hr},${temp},${behavior},${alert}\n`;
}

fs.writeFileSync('pet_health_dataset.csv', csvContent);
console.log("✅ Đã tạo thành công 5000 dòng dữ liệu giả lập vào file pet_health_dataset.csv");