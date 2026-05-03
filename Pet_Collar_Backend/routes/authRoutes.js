const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');

router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, confirm_password } = req.body;
        if (password !== confirm_password) return res.status(400).json({ status: "error", message: "Mật khẩu xác nhận không khớp!" });
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return res.status(400).json({ status: "error", message: "Định dạng email không hợp lệ!" });

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ status: "error", message: "Email đã được sử dụng!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, full_name, email',
            [full_name, email, hashedPassword]
        );
        res.status(201).json({ status: "success", message: "Đăng ký thành công!", data: newUser.rows[0] });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (user.rows.length === 0) return res.status(401).json({ status: "error", message: "Email hoặc mật khẩu không đúng!" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ status: "error", message: "Email hoặc mật khẩu không đúng!" });

        const token = jwt.sign({ user_id: user.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            status: "success", message: "Đăng nhập thành công!", token: token,
            user: { id: user.rows[0].user_id, name: user.rows[0].full_name, email: user.rows[0].email }
        });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { old_password, new_password, confirm_new_password } = req.body;
        const userId = req.user.user_id;

        if (new_password !== confirm_new_password) return res.status(400).json({ status: "error", message: "Mật khẩu mới xác nhận không khớp!" });
        if (old_password === new_password) return res.status(400).json({ status: "error", message: "Mật khẩu mới phải khác mật khẩu hiện tại!" });

        const user = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        if (user.rows.length === 0) return res.status(404).json({ status: "error", message: "Không tìm thấy người dùng!" });

        const validPassword = await bcrypt.compare(old_password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ status: "error", message: "Mật khẩu cũ không chính xác!" });

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(new_password, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hashedNewPassword, userId]);
        res.json({ status: "success", message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        console.error(error); res.status(500).json({ status: "error", message: "Lỗi Server" });
    }
});

module.exports = router;