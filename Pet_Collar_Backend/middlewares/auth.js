const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ status: "error", message: "Yêu cầu xác thực! Vui lòng đăng nhập." });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ status: "error", message: "Token không hợp lệ hoặc đã hết hạn!" });
    }
};

module.exports = authenticateToken;