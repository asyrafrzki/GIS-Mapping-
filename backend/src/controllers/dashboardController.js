import { pool } from '../config/db.js';

export async function getUserDashboard(req, res) {
  try {
    const [pointsCount, reportsCount, latestPoints, latestReports] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM field_points WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT COUNT(*)::int AS total FROM reports WHERE user_id = $1', [req.user.id]),
      pool.query(
        `SELECT id, nama, jenis, tanah_user, lokasi, daerah, radius, created_at
         FROM field_points
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [req.user.id]
      ),
      pool.query(
        `SELECT id, title, category, status, created_at
         FROM reports
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [req.user.id]
      ),
    ]);

    return res.json({
      totalPoints: pointsCount.rows[0].total,
      totalReports: reportsCount.rows[0].total,
      latestPoints: latestPoints.rows,
      latestReports: latestReports.rows,
    });
  } catch (err) {
    console.error('getUserDashboard error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const [usersCount, pointsCount, reportsCount, pendingReports] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'user'`),
      pool.query('SELECT COUNT(*)::int AS total FROM field_points'),
      pool.query('SELECT COUNT(*)::int AS total FROM reports'),
      pool.query(`SELECT COUNT(*)::int AS total FROM reports WHERE status IN ('baru','diproses')`),
    ]);

    return res.json({
      totalUsers: usersCount.rows[0].total,
      totalPoints: pointsCount.rows[0].total,
      totalReports: reportsCount.rows[0].total,
      pendingReports: pendingReports.rows[0].total,
    });
  } catch (err) {
    console.error('getAdminDashboard error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}