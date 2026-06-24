import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { setup_key } = await req.json();
    if (setup_key !== 'bellas-setup-2026') {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }


    // Ensure user_branches table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        branch_code VARCHAR(10) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        UNIQUE KEY uk_user_branch (user_id, branch_code)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        old_status VARCHAR(30),
        new_status VARCHAR(30),
        action_by INT,
        action_by_name VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_log_ticket (ticket_id),
        INDEX idx_log_created (created_at)
      )
    `).catch(e => console.log('[Setup] Activity log:', e.message));

    // Migration: add PAUSED columns to tickets
    await pool.query(`ALTER TABLE tickets ADD COLUMN paused_reason VARCHAR(255) NULL`).catch(() => {});
    await pool.query(`ALTER TABLE tickets ADD COLUMN paused_at DATETIME NULL`).catch(() => {});
    await pool.query(`ALTER TABLE tickets ADD COLUMN paused_expected_end DATETIME NULL`).catch(() => {});

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
    `).catch(e => console.log('[Setup] PM table might exist:', e.message));

    const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length > 0) {
      
    // Ensure admin has user_branches entry
    const [ubCheck]: any = await pool.query("SELECT user_id FROM users WHERE username = ?", ["admin"]);
    if (ubCheck.length > 0) {
      await pool.query("INSERT IGNORE INTO user_branches (user_id, branch_code) VALUES (?, ?)", [ubCheck[0].user_id, "BV"]);
    }
   
    return NextResponse.json({ success: true, message: 'Migration complete — admin already exists' });
    }

    const hashed = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, full_name, role, branch_code, department) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', hashed, 'ผู้ดูแลระบบ', 'admin', 'BV', 'ADMIN']
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
