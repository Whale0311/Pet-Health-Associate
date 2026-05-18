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

        const defaultImage = "https://img.icons8.com/fluency/96/dog.png";
        
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

// Hủy theo dõi / Xóa thú cưng
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id; // Lấy ID của người đang bấm nút xóa
        const petId = req.params.id;
        await pool.query('DELETE FROM notifications WHERE user_id = $1 AND pet_id = $2', [userId, petId]);
        // 1. Chỉ cắt đứt liên kết giữa người này và thú cưng
        await pool.query('DELETE FROM user_pets WHERE user_id = $1 AND pet_id = $2', [userId, petId]);

        // 2. Kiểm tra xem thú cưng này còn ai trong nhà theo dõi không?
        const checkRemaining = await pool.query('SELECT COUNT(*) FROM user_pets WHERE pet_id = $1', [petId]);
        
        if (parseInt(checkRemaining.rows[0].count) === 0) {
            // 3. Nếu không còn ai theo dõi nữa, tiến hành xóa hoàn toàn khỏi hệ thống
            // (Lưu ý: Nếu database của bạn có cài CASCADE, nó sẽ tự xóa luôn logs và notifications của pet này)
            await pool.query('DELETE FROM pets WHERE pet_id = $1', [petId]);
        }

        res.json({ status: "success", message: "Đã xóa/ngừng theo dõi thú cưng thành công!" });
    } catch (error) {
        console.error("Lỗi xóa Pet:", error); 
        res.status(500).json({ status: "error", message: "Lỗi máy chủ nội bộ" });
    }
});

// Lấy lịch sử sức khỏe của 1 thú cưng
router.get('/:id/health-logs', authenticateToken, async (req, res) => {
    try {
        const query = `SELECT * FROM pet_health_logs WHERE pet_id = $1 ORDER BY timestamp DESC LIMIT 6;`;
        const result = await pool.query(query, [req.params.id]);
        res.json({ status: "success", data: result.rows });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi máy chủ nội bộ" });
    }
});
// API: Thêm thú cưng đã có sẵn (dành cho người nhà)
router.post('/join', authenticateToken, async (req, res) => {
    try {
        const { mac_address } = req.body;
        const userId = req.user.user_id; // Lấy ID người dùng từ Token

        if (!mac_address) {
            return res.status(400).json({ status: "error", message: "Vui lòng cung cấp địa chỉ MAC!" });
        }

        // 1. Tìm thú cưng dựa trên MAC
        const petResult = await pool.query('SELECT pet_id FROM pets WHERE mac_address = $1', [mac_address]);
        
        if (petResult.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Không tìm thấy thú cưng với địa chỉ MAC này!" });
        }

        const petId = petResult.rows[0].pet_id;

        // 2. Kiểm tra xem người này đã theo dõi bé này chưa để tránh trùng lặp
        const checkExist = await pool.query('SELECT * FROM user_pets WHERE user_id = $1 AND pet_id = $2', [userId, petId]);
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ status: "error", message: "Bạn đã theo dõi thú cưng này rồi!" });
        }

        // 3. Liên kết người dùng với thú cưng
        await pool.query('INSERT INTO user_pets (user_id, pet_id) VALUES ($1, $2)', [userId, petId]);

        res.status(200).json({ status: "success", message: "Đã thêm thú cưng thành công!" });

    } catch (error) {
        console.error('❌ Lỗi API Join Pet:', error);
        res.status(500).json({ status: "error", message: "Lỗi máy chủ nội bộ" });
    }
});
module.exports = router;