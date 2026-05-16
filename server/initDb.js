import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
  });

  try {
    const dbName = process.env.DB_NAME || 'codegate_db';
    await connection.query("CREATE DATABASE IF NOT EXISTS `" + dbName + "`");
    await connection.query("USE `" + dbName + "`");

    console.log("Database " + dbName + " selected/created.");

    // Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        avatar LONGTEXT,
        department VARCHAR(100),
        roomNumber VARCHAR(50),
        hostelBlock VARCHAR(50),
        usn VARCHAR(50),
        uid VARCHAR(50),
        parentPhone VARCHAR(50),
        address TEXT
      )
    `);
    console.log('Users table initialized.');

    // Leaves Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id VARCHAR(255) PRIMARY KEY,
        studentId VARCHAR(255) NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        studentRoom VARCHAR(50),
        type VARCHAR(50) NOT NULL,
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        reason TEXT,
        status VARCHAR(50) NOT NULL,
        appliedAt DATETIME NOT NULL,
        appliedBy VARCHAR(50),
        approvedBy VARCHAR(255),
        qrCode VARCHAR(500),
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Leaves table initialized.');

    // Security Logs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id VARCHAR(255) PRIMARY KEY,
        studentId VARCHAR(255) NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        timestamp DATETIME NOT NULL,
        gate VARCHAR(50),
        verifiedBy VARCHAR(255),
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Security Logs table initialized.');

    // OTPs Table (temporary holding pen for email verification)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);
    console.log('OTPs table initialized.');

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await connection.end();
  }
}

initializeDatabase();
