const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

// 🧠 ĐỌC BỘ NÃO AI (Tải mô hình vào bộ nhớ RAM khi Server khởi động)
const modelPath = path.join(__dirname, '../pet_ai_model.json');
const aiModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

/**
 * 🌳 HÀM SUY LUẬN AI (Duyệt cây quyết định - Đọc hiểu file JSON)
 * @param {Object} node - Nút hiện tại của cây
 * @param {Object} data - Dữ liệu đầu vào { heart_rate, temp_celsius, behavior_code }
 * @returns {Number} - Mức độ cảnh báo (0: Normal, 1: Warning, 2: Danger)
 */
function predictAlertLevel(node, data) {
    // Nếu chạm tới nút lá (Leaf Node), trả về kết quả dự đoán của AI
    if (node.value !== undefined) {
        return node.value;
    }
    
    // Lấy chỉ số sức khỏe mà nút hiện tại đang muốn kiểm tra
    const currentFeatureValue = data[node.feature];
    
    // Duyệt sang nhánh trái hoặc nhánh phải dựa trên ngưỡng (threshold) của AI
    if (currentFeatureValue <= node.threshold) {
        return predictAlertLevel(node.left, data);
    } else {
        return predictAlertLevel(node.right, data);
    }
}

// ==========================================
// API TIẾP NHẬN DỮ LIỆU VÀ CẢNH BÁO AI
// ==========================================
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { pet_id, behavior_code, heart_rate, temp_celsius, humidity } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!pet_id || heart_rate === undefined || temp_celsius === undefined || behavior_code === undefined) {
            return res.status(400).json({ status: "error", message: "Thiếu thông tin!" });
        }
        
        // Khử nhiễu phần cứng cơ bản
        if (heart_rate < 0 || heart_rate > 300 || temp_celsius < 10 || temp_celsius > 50) {
            return res.status(400).json({ status: "error", message: "Nhiễu dữ liệu." });
        }

        // 2. Lưu dữ liệu raw vào Database
        const healthLogQuery = `INSERT INTO pet_health_logs (pet_id, behavior_code, heart_rate, temp_celsius, humidity) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const result = await pool.query(healthLogQuery, [pet_id, behavior_code, heart_rate, temp_celsius, humidity]);

        // 3. Phát sóng dữ liệu thời gian thực qua Socket.io về App
        req.io.emit(`new_health_data_${pet_id}`, result.rows[0]);

        // 4. CHẠY SUY LUẬN AI (Dự đoán mức độ nguy hiểm)
        const alertLevel = predictAlertLevel(aiModel, { 
            heart_rate: heart_rate, 
            temp_celsius: temp_celsius, 
            behavior_code: behavior_code 
        });

        console.log(`🤖 [AI PREDICTION] Thú cưng ID ${pet_id} có mức độ rủi ro là: ${alertLevel}`);

        let alertTitle = null;
        let alertMessage = null;

        // Phân loại nội dung thông báo dựa trên nhãn dự đoán của AI
        if (alertLevel === 1) {
            alertTitle = "⚠️ Health Alert (Warning)";
            alertMessage = `Abnormal health signs detected. Heart Rate: ${heart_rate} bpm, Temp: ${temp_celsius}°C. Please check your pet.`;
        } else if (alertLevel === 2) {
            alertTitle = "🚨 Emergency Alert (Danger)!";
            alertMessage = `Critical health status detected! Heart Rate: ${heart_rate} bpm, Temp: ${temp_celsius}°C. Inspect immediately!`;
        }

        // 5. Nếu AI phát hiện bất thường, tiến hành tạo thông báo trong DB và bắn notify Real-time
        if (alertTitle) {
            const ownersResult = await pool.query(`SELECT user_id FROM user_pets WHERE pet_id = $1`, [pet_id]);
            
            const notifications = await Promise.all(ownersResult.rows.map(async (owner) => {
                const notiResult = await pool.query(
                    `INSERT INTO notifications (user_id, pet_id, title, message) VALUES ($1, $2, $3, $4) RETURNING *;`, 
                    [owner.user_id, pet_id, alertTitle, alertMessage]
                );
                return notiResult.rows[0];
            }));
            
            notifications.forEach(noti => {
                req.io.emit(`new_alert_user_${noti.user_id}`, noti);
            });
        }

        res.status(201).json({ status: "success", data: result.rows[0] });
    } catch (error) {
        console.error('❌ Lỗi xử lý API Health Logs:', error); 
        res.status(500).json({ status: "error", message: "Lỗi máy cushions nội bộ" });
    }
});

module.exports = router;