const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { pet_id, behavior_code, heart_rate, temp_celsius, humidity } = req.body;

        if (!pet_id || heart_rate === undefined || temp_celsius === undefined || behavior_code === undefined) {
            return res.status(400).json({ status: "error", message: "Thiếu thông tin!" });
        }
        if (heart_rate < 0 || heart_rate > 300 || temp_celsius < 10 || temp_celsius > 50) {
            return res.status(400).json({ status: "error", message: "Nhiễu dữ liệu." });
        }

        const healthLogQuery = `INSERT INTO pet_health_logs (pet_id, behavior_code, heart_rate, temp_celsius, humidity) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const result = await pool.query(healthLogQuery, [pet_id, behavior_code, heart_rate, temp_celsius, humidity]);

        req.io.emit(`new_health_data_${pet_id}`, result.rows[0]);

        let alertTitle = null;
        let alertMessage = null;

        if (heart_rate > 140 && behavior_code === 0) {
            const historyResult = await pool.query(`SELECT COUNT(*) FROM pet_health_logs WHERE pet_id = $1 AND timestamp >= NOW() - INTERVAL '5 minutes' AND behavior_code IN (1, 2)`, [pet_id]);
            if (parseInt(historyResult.rows[0].count) === 0) {
                alertTitle = "🚨 Cảnh báo Sức khỏe Khẩn cấp!"; alertMessage = "Nhịp tim cao bất thường trong lúc nghỉ ngơi.";
            }
        } else if (temp_celsius > 39.5) {
            alertTitle = "⚠️ Cảnh báo Nhiệt độ cao!"; alertMessage = `Nhiệt độ hiện tại là ${temp_celsius}°C, vượt mức an toàn.`;
        } else if (heart_rate > 160) {
            alertTitle = "💓 Nhịp tim tăng cao đột ngột!"; alertMessage = `Nhịp tim đang ở mức ${heart_rate} bpm.`;
        }

        if (alertTitle) {
            const ownersResult = await pool.query(`SELECT user_id FROM user_pets WHERE pet_id = $1`, [pet_id]);
            const notifications = await Promise.all(ownersResult.rows.map(async (owner) => {
                const notiResult = await pool.query(`INSERT INTO notifications (user_id, pet_id, title, message) VALUES ($1, $2, $3, $4) RETURNING *;`, [owner.user_id, pet_id, alertTitle, alertMessage]);
                return notiResult.rows[0];
            }));
            notifications.forEach(noti => {
                req.io.emit(`new_alert_user_${noti.user_id}`, noti); // Sử dụng req.io
            });
        }
        res.status(201).json({ status: "success", data: result.rows[0] });
    } catch (error) {
        console.error('❌ Lỗi:', error); res.status(500).json({ status: "error", message: "Lỗi máy chủ nội bộ" });
    }
});

module.exports = router;