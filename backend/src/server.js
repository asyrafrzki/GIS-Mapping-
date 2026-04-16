import dotenv from 'dotenv';
import app from './app.js';
import { testDbConnection } from './config/db.js';
import { seedAdmin } from './seed/seedAdmin.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await testDbConnection();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();