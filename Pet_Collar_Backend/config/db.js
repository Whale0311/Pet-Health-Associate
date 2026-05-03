const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Dùng biến này cho Cloud
    ssl: {
        rejectUnauthorized: false // Bắt buộc khi đưa lên Cloud
    }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Lỗi kết nối CSDL:', err.stack);
    } else {
        console.log('✅ Đã kết nối thành công với PostgreSQL!');
        release();
    }
});

module.exports = pool;