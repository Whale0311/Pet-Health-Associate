const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `SELECT n.*, p.name as pet_name FROM notifications n JOIN pets p ON n.pet_id = p.pet_id WHERE n.user_id = $1 ORDER BY n.created_at DESC;`;
        const result = await pool.query(query, [req.user.user_id]);
        res.json({ status: "success", data: result.rows });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Lỗi lấy danh sách thông báo" });
    }
});

router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.user_id]);
        res.json({ status: "success", message: "Đã đọc toàn bộ thông báo" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Lỗi cập nhật" });
    }
});

router.put('/:notiId/read', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE noti_id = $1 AND user_id = $2', [req.params.notiId, req.user.user_id]);
        res.json({ status: "success", message: "Đã đọc thông báo" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Lỗi cập nhật" });
    }
});

module.exports = router;