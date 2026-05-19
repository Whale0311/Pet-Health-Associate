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
 */
function predictAlertLevel(node, data) {
    if (node.value !== undefined) {
        return node.value;
    }
    
    const currentFeatureValue = data[node.feature];
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

        // 2. Lưu dữ liệu raw vào Database trước tiên để đảm bảo luôn có kết quả
        const healthLogQuery = `INSERT INTO pet_health_logs (pet_id, behavior_code, heart_rate, temp_celsius, humidity) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const result = await pool.query(healthLogQuery, [pet_id, behavior_code, heart_rate, temp_celsius, humidity]);

        // 3. Phát sóng dữ liệu thời gian thực qua Socket.io về App
        req.io.emit(`new_health_data_${pet_id}`, result.rows[0]);

        // ==========================================
        // 4. BỘ LỌC CẢM BIẾN (Tuột vòng cổ)
        // ==========================================
        if (heart_rate < 40 || temp_celsius < 32) {
            console.log(`⚠️ [SENSOR DETACHED] Thú cưng ID ${pet_id} có thể đã tháo vòng cổ.`);
            
            // Chống spam 30 phút
            const checkSpamQuery = `SELECT COUNT(*) FROM notifications WHERE pet_id = $1 AND title = '⚠️ Collar Detached' AND created_at >= NOW() - INTERVAL '30 minutes'`;
            const spamResult = await pool.query(checkSpamQuery, [pet_id]);
            
            if (parseInt(spamResult.rows[0].count) === 0) {
                const alertTitle = "⚠️ Collar Detached";
                const alertMessage = "The sensor is not detecting skin contact. Please check if the collar is loose or has fallen off.";
                
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

            // An toàn thoát luồng với dữ liệu trả về đúng chuẩn
            return res.status(201).json({ 
                status: "success", 
                message: "Collar detached. AI Alert bypassed.",
                data: result.rows[0] 
            });
        }

        // ==========================================
        // 5. CHẠY AI & CẢNH BÁO SỨC KHỎE
        // ==========================================
        const coreTempCelsius = temp_celsius + 1.5;
        
        // Đã sửa: Truyền đúng coreTempCelsius vào AI
        const alertLevel = predictAlertLevel(aiModel, { 
            heart_rate: heart_rate, 
            temp_celsius: coreTempCelsius, 
            behavior_code: behavior_code 
        });

        console.log(`🤖 [AI PREDICTION] Thú cưng ID ${pet_id} có mức độ rủi ro là: ${alertLevel}`);

        if (alertLevel === 1 || alertLevel === 2) {
            const alertTitle = alertLevel === 1 ? "⚠️ Health Alert (Warning)" : "🚨 Emergency Alert (Danger)!";
            const alertMessage = alertLevel === 1 
                ? `Abnormal health signs detected. Heart Rate: ${heart_rate} bpm, Temp: ${temp_celsius}°C. Please check your pet.` 
                : `Critical health status detected! Heart Rate: ${heart_rate} bpm, Temp: ${temp_celsius}°C. Inspect immediately!`;

            // THUẬT TOÁN CHỐNG SPAM AI (10 Phút / lần) để tránh sập Socket
            const checkAISpamQuery = `SELECT COUNT(*) FROM notifications WHERE pet_id = $1 AND title = $2 AND created_at >= NOW() - INTERVAL '10 minutes'`;
            const aiSpamResult = await pool.query(checkAISpamQuery, [pet_id, alertTitle]);

            if (parseInt(aiSpamResult.rows[0].count) === 0) {
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
        }

        res.status(201).json({ status: "success", data: result.rows[0] });
    } catch (error) {
        console.error('❌ Lỗi xử lý API Health Logs:', error); 
        res.status(500).json({ status: "error", message: "Lỗi máy chủ nội bộ" });
    }
});

module.exports = router;