-- PM (Preventive Maintenance) Schedules
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
  INDEX idx_next_run (next_run),
  INDEX idx_branch (branch_code)
);
