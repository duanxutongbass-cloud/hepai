import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:key', authenticateToken, async (req: any, res) => {
  const { key } = req.params;
  const userId = req.user.id;
  try {
    const [rows]: any = await pool.execute(
      'SELECT meta_value FROM app_metadata WHERE user_id = ? AND meta_key = ?',
      [userId, key]
    );
    res.json(rows[0]?.meta_value || null);
  } catch (err) {
    res.status(500).json({ error: '获取元数据失败' });
  }
});

router.post('/', authenticateToken, async (req: any, res) => {
  const { key, value } = req.body;
  const userId = req.user.id;
  try {
    await pool.execute(
      `INSERT INTO app_metadata (user_id, meta_key, meta_value) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
      [userId, key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save metadata error:', err);
    res.status(500).json({ error: '保存元数据失败' });
  }
});

export default router;
