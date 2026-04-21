import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接并初始化表结构
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功！');
    
    // 初始化表结构
    console.log('正在检查并初始化数据库表...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        composer VARCHAR(255),
        category VARCHAR(100),
        file_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        user_id INT NOT NULL,
        meta_key VARCHAR(100) NOT NULL,
        meta_value TEXT,
        PRIMARY KEY (user_id, meta_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ 数据库架构初始化完成');
    connection.release();
  } catch (err: any) {
    console.error('❌ 数据库操作失败！请检查以下事项：');
    console.error('1. .env 中的 DB_HOST 是否正确 (群晖 IP?)');
    console.error('2. 是否已经在 NAS 的 MariaDB 中手动创建了 DB_NAME 对应的数据库?');
    console.error('3. 账号密码是否正确?');
    console.error('错误细节:', err.message);
  }
})();

export default pool;
