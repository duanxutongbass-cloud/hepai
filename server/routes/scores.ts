import express from 'express';
import multer from 'multer';
import pool from '../db.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.post('/', upload.single('file'), async (req: any, res) => {
  const { title, composer, category } = req.body;
  const filePath = req.file?.path;
  try {
    const [result]: any = await pool.execute(
      'INSERT INTO scores (title, composer, category, file_path) VALUES (?, ?, ?, ?)',
      [title, composer, category, filePath]
    );
    res.json({ id: result.insertId, title, composer, category, file_path: filePath });
  } catch (err) {
    console.error('Upload score error:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM scores ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get scores error:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

export default router;
