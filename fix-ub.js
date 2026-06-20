var fs = require('fs');
var s = fs.readFileSync('app/api/setup/route.ts', 'utf8');

// SQL for user_branches table
var createUb = [
  '',
  '    // Ensure user_branches table exists',
  '    await pool.query(`',
  '      CREATE TABLE IF NOT EXISTS user_branches (',
  '        id INT AUTO_INCREMENT PRIMARY KEY,',
  '        user_id INT NOT NULL,',
  '        branch_code VARCHAR(10) NOT NULL,',
  '        FOREIGN KEY (user_id) REFERENCES users(user_id),',
  '        UNIQUE KEY uk_user_branch (user_id, branch_code)',
  '      )',
  '    `);',
  '',
].join('\n');

// Insert before pm_schedules creation
s = s.replace(
  '    // Always run migrations first\n    await pool.query(`\n      CREATE TABLE IF NOT EXISTS pm_schedules',
  createUb + '    await pool.query(`\n      CREATE TABLE IF NOT EXISTS pm_schedules'
);

// Ensure admin has user_branches entry
var adminBranchFix = '\n    // Ensure admin has user_branches entry\n    const [ubCheck]: any = await pool.query("SELECT user_id FROM users WHERE username = ?", ["admin"]);\n    if (ubCheck.length > 0) {\n      await pool.query("INSERT IGNORE INTO user_branches (user_id, branch_code) VALUES (?, ?)", [ubCheck[0].user_id, "BV"]);\n    }\n   ';
s = s.replace(
  "return NextResponse.json({ success: true, message: 'Migration complete — admin already exists' });",
  adminBranchFix + "\n    return NextResponse.json({ success: true, message: 'Migration complete — admin already exists' });"
);

fs.writeFileSync('app/api/setup/route.ts', s, 'utf8');
console.log('Done — user_branches added to setup');
