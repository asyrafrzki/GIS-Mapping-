import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export async function seedAdmin() {
  const existing = await pool.query(
    'SELECT id FROM users WHERE role = $1 LIMIT 1',
    ['admin']
  );

  if (existing.rows.length > 0) return;

  const passwordHash = await bcrypt.hash('admin123', 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)`,
    ['Administrator', 'admin@soilmap.local', passwordHash, 'admin']
  );

  console.log('Admin seeded: admin@soilmap.local / admin123');
}