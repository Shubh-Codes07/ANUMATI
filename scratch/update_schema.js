import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Updating users table schema...');
    await connection.query('ALTER TABLE users MODIFY avatar LONGTEXT');
    console.log('✅ avatar column updated to LONGTEXT');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  } finally {
    await connection.end();
  }
}

updateSchema();
