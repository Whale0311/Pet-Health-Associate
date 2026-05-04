const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, gender, dob, weight, mac_address, image_url } = req.body;
        const userId = req.user.user_id;

        if (!name || !mac_address) return res.status(400).json({ status: "error", message: "Tên và Địa chỉ MAC là bắt buộc!" });

        const checkMac = await pool.query('SELECT pet_id FROM pets WHERE mac_address = $1', [mac_address]);
        if (checkMac.rows.length > 0) return res.status(400).json({ status: "error", message: "MAC đã được kết nối!" });

        const defaultImage = "https://cdn-icons-png.flaticon.com/512/8204/8204652.png";
        
        await pool.query('BEGIN'); 
        const insertPetQuery = `INSERT INTO pets (name, gender, dob, weight, mac_address, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
        const newPet = await pool.query(insertPetQuery, [name, gender || null, dob || null, weight || null, mac_address, image_url || defaultImage]);
        
        await pool.query('INSERT INTO user_pets (user_id, pet_id) VALUES ($1, $2)', [userId, newPet.rows[0].pet_id]);
        await pool.query('COMMIT'); 

        res.status(201).json({ status: "success", message: "Đã thêm thú cưng!", data: newPet.rows[0] });
    } catch (error) {
        await pool.query('ROLLBACK'); console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `SELECT p.* FROM pets p JOIN user_pets up ON p.pet_id = up.pet_id WHERE up.user_id = $1 ORDER BY p.created_at DESC;`;
        const myPets = await pool.query(query, [req.user.user_id]);
        res.json({ status: "success", data: myPets.rows });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, gender, dob, weight, image_url } = req.body;
        const query = `
            UPDATE pets SET name = COALESCE($1, name), gender = COALESCE($2, gender), dob = COALESCE($3, dob), weight = COALESCE($4, weight), image_url = COALESCE($5, image_url)
            WHERE pet_id = $6 RETURNING *;
        `;
        const updatedPet = await pool.query(query, [name || null, gender || null, dob || null, weight || null, image_url || null, req.params.id]);

        if (updatedPet.rows.length === 0) return res.status(404).json({ status: "error", message: "Không tìm thấy thú cưng!" });
        res.json({ status: "success", message: "Đã cập nhật thông tin!", data: updatedPet.rows[0] });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM pets WHERE pet_id = $1', [req.params.id]);
        res.json({ status: "success", message: "Đã xóa thú cưng khỏi hệ thống!" });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

// Lấy lịch sử sức khỏe của 1 thú cưng
router.get('/:id/health-logs', authenticateToken, async (req, res) => {
    try {
        const query = `SELECT * FROM pet_health_logs WHERE pet_id = $1 ORDER BY timestamp DESC LIMIT 10;`;
        const result = await pool.query(query, [req.params.id]);
        res.json({ status: "success", data: result.rows });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi máy chủ nội bộ" });
    }
});

module.exports = router;