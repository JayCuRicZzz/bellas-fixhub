import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { setup_key } = await req.json();
    if (setup_key !== 'bellas-setup-2026') {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length > 0) {
      return NextResponse.json({ message: 'Admin already exists' });
    }

    // Create pm_schedules table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pm_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_code VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        department VARCHAR(10) DEFAULT 'MAINT',
        category_id INT NOT NULL,
        frequency_value INT NOT NULL,
        frequency_unit ENUM('day','week','month','year') NOT NULL DEFAULT 'month',
        last_run DATETIME NULL,
        next_run DATETIME NOT NULL,
        created_by INT NOT NULL,
        active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(category_id),
        FOREIGN KEY (created_by) REFERENCES users(user_id),
        INDEX idx_pm_next_run (next_run),
        INDEX idx_pm_branch (branch_code)
      )
    `);

    const hashed = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, full_name, role, branch_code, department) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', hashed, 'ผู้ดูแลระบบ', 'admin', 'BVP1', 'ADMIN']
    );

    const [cats]: any = await pool.query('SELECT COUNT(*) as cnt FROM categories');
    if (cats[0].cnt === 0) {
      const defaultCats = [
        ['แอร์ไม่เย็น', 'แอร์', 'MAINT'], ['แอร์มีเสียงดัง', 'แอร์', 'MAINT'], ['แอร์น้ำหยด', 'แอร์', 'MAINT'],
        ['ไฟดับ', 'ไฟฟ้า', 'MAINT'], ['ปลั๊กไฟเสีย', 'ไฟฟ้า', 'MAINT'], ['เบรกเกอร์ตัด', 'ไฟฟ้า', 'MAINT'],
        ['น้ำไม่ไหล', 'ประปา', 'MAINT'], ['ท่อรั่ว', 'ประปา', 'MAINT'], ['ชักโครกตัน', 'ประปา', 'MAINT'],
        ['WiFi ใช้ไม่ได้', 'ไวไฟ', 'IT'], ['อินเทอร์เน็ตช้า', 'ไวไฟ', 'IT'],
        ['คอมพิวเตอร์เสีย', 'คอม', 'IT'], ['ทีวีเสีย', 'เครื่องใช้ไฟฟ้า', 'MAINT'], ['ตู้เย็นไม่เย็น', 'เครื่องใช้ไฟฟ้า', 'MAINT'],
        ['อื่นๆ', 'ทั่วไป', 'MAINT'],
      ];
      for (const [main, sub, dept] of defaultCats) {
        await pool.query('INSERT INTO categories (main_th, sub_th, dept_type) VALUES (?, ?, ?)', [main, sub, dept]);
      }
    }

    return NextResponse.json({ success: true, message: 'Setup complete — admin/admin123' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
