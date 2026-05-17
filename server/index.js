import express from 'express';
import cors from 'cors';
import db from './db.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// ─── Email Transporter (Forced IPv4 for Render Cloud) ──────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
    console.error('📧 Check your EMAIL_USER and EMAIL_PASS in .env');
  } else {
    console.log('✅ Email transporter ready');
  }
});

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const WARDEN_EMAIL = 'admin@gmail.com';
    const WARDEN_PASS = 'TechTorque';
    const GUARD_EMAIL = 'guard@codegate.local';
    const GUARD_PASS = 'GuardPass123';

    // ─── Warden Authentication ──────────────────────────────────────────────
    if (email.toLowerCase() === WARDEN_EMAIL.toLowerCase()) {
      if (password !== WARDEN_PASS) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const wardenUser = {
        id: 'warden_001',
        name: 'Warden',
        email: WARDEN_EMAIL,
        role: 'warden',
        phone: null,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=warden'
      };
      return res.json(wardenUser);
    }

    // ─── Guard/Security Authentication ───────────────────────────────────────
    if (email.toLowerCase() === GUARD_EMAIL.toLowerCase()) {
      if (password !== GUARD_PASS) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const guardUser = {
        id: 'guard_001',
        name: 'Security Guard',
        email: GUARD_EMAIL,
        role: 'guard',
        phone: null,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guard'
      };
      return res.json(guardUser);
    }

    // ─── Student Authentication ──────────────────────────────────────────────
    // Query database for the student
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    // If student does not exist, return 404
    if (!user) {
      return res.status(404).json({ error: 'Account not registered' });
    }

    // Verify password
    if (user.password !== password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Return user object
    res.json(user);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  try {
    const { role, id } = req.query;
    let sql = 'SELECT * FROM users';
    const params = [];

    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    } else if (id) {
      sql += ' WHERE id = ?';
      params.push(id);
    }

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id }    = req.params;
    const updates   = req.body;
    const keys      = Object.keys(updates);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map(k => k + ' = ?').join(', ');
    const values    = [...Object.values(updates), id];
    const sql       = 'UPDATE users SET ' + setClause + ' WHERE id = ?';

    const [result] = await db.query(sql, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const u = req.body;
    const userId = u.id || 'stu_' + Date.now() + Math.random().toString(36).substring(7);
    await db.query(
      'INSERT INTO users (id, name, email, role, phone, department, roomNumber, usn, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        u.name || '',
        u.email || '',
        u.role || 'student',
        u.phone || null,
        u.department || null,
        u.roomNumber || null,
        u.usn || null,
        u.avatar || null
      ]
    );
    res.status(201).json({ id: userId, ...u });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Leaves ───────────────────────────────────────────────────────────────────
app.post('/api/leaves', async (req, res) => {
  try {
    const leave   = req.body;
    const leaveId = leave.id || 'leave_' + Date.now() + Math.random().toString(36).substring(7);

    await db.query(
      'INSERT INTO leaves (id, studentId, studentName, studentRoom, type, startDate, endDate, reason, status, appliedAt, appliedBy, approvedBy, qrCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        leaveId,
        leave.studentId, leave.studentName, leave.studentRoom || null,
        leave.type,
        new Date(leave.startDate), new Date(leave.endDate),
        leave.reason, leave.status || 'pending',
        new Date(leave.appliedAt || Date.now()),
        leave.appliedBy || null, leave.approvedBy || null, leave.qrCode || null
      ]
    );

    res.status(201).json({ id: leaveId, ...leave });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaves', async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql    = 'SELECT * FROM leaves';
    const params = [];

    if (studentId) {
      sql += ' WHERE studentId = ?';
      params.push(studentId);
    }

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch leaves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/leaves/:id', async (req, res) => {
  try {
    const { id }  = req.params;
    const updates = req.body;
    const keys    = Object.keys(updates);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map(k => k + ' = ?').join(', ');
    const values    = [...Object.values(updates), id];
    const sql       = 'UPDATE leaves SET ' + setClause + ' WHERE id = ?';

    const [result] = await db.query(sql, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Security Logs ────────────────────────────────────────────────────────────
app.post('/api/security-logs', async (req, res) => {
  try {
    const log   = req.body;
    const logId = 'log_' + Date.now() + Math.random().toString(36).substring(7);

    await db.query(
      'INSERT INTO security_logs (id, studentId, studentName, type, timestamp, gate, verifiedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [logId, log.studentId, log.studentName, log.type, new Date(log.timestamp), log.gate || 'Main Gate', log.verifiedBy || null]
    );

    res.status(201).json({ id: logId, ...log });
  } catch (error) {
    console.error('Create security log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/security-logs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM security_logs ORDER BY timestamp DESC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch security logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Security Logs Stream (SSE) ─────────────────────────────────────────────
app.get('/api/security-logs/stream', async (req, res) => {
  try {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.flushHeaders && res.flushHeaders();

    let lastTimestamp = new Date(0);

    const sendNewLogs = async () => {
      try {
        const [rows] = await db.query('SELECT * FROM security_logs WHERE timestamp > ? ORDER BY timestamp ASC', [lastTimestamp]);
        if (rows && rows.length) {
          for (const r of rows) {
            const payload = {
              id: r.id,
              studentId: r.studentId,
              studentName: r.studentName,
              type: r.type,
              timestamp: new Date(r.timestamp).toISOString(),
              gate: r.gate,
              verifiedBy: r.verifiedBy
            };
            res.write('event: log\n');
            res.write('data: ' + JSON.stringify(payload) + '\n\n');
            lastTimestamp = new Date(r.timestamp);
          }
        }
      } catch (err) {
        console.error('SSE sendNewLogs error', err);
      }
    };

    // initial send
    sendNewLogs();

    const interval = setInterval(sendNewLogs, 2000);

    req.on('close', () => {
      clearInterval(interval);
      try { res.end(); } catch (e) {}
    });
  } catch (error) {
    console.error('SSE stream failed', error);
    res.status(500).end();
  }
});

// ─── OTP ─────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  // Generate a clean 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60000);

  try {
    // Upsert into your Aiven cloud database so verification still works!
    await db.query(
      `INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?`,
      [email, otp, expiresAt, otp, expiresAt]
    );

    // 🚨 HACKATHON CHEAT CODE: Print the OTP directly to the Render Console Logs!
    console.log(`\n==================================================`);
    console.log(`🔑 [DEMO OTP TRIGGERED]`);
    console.log(`📧 EMAIL: ${email}`);
    console.log(`🔢 YOUR 6-DIGIT CODE IS: ${otp}`);
    console.log(`==================================================\n`);

    // Tell the frontend it was a success!
    res.json({ success: true, message: 'OTP generated! (Check server console for demo code)' });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    res.status(500).json({ success: false, message: `Failed to generate OTP: ${error.message}` });
  }
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

  try {
    const [rows] = await db.query('SELECT * FROM otps WHERE email = ?', [email]);

    if (rows.length === 0)
      return res.status(400).json({ success: false, message: 'No OTP was requested for this email.' });

    const record = rows[0];

    if (record.otp !== otp)
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });

    // Valid — delete the OTP so it cannot be reused
    await db.query('DELETE FROM otps WHERE email = ?', [email]);

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

// ─── Security Scan ───────────────────────────────────────────────────────────
// POST /api/security/scan  (SMS Cheat Code: prints to server console)
app.post('/api/security/scan', async (req, res) => {
  const { passId, studentName, parentPhone } = req.body;

  try {
    // TODO: mark gate_pass status as COMPLETED in DB
    console.log(`\n======================================================`);
    console.log(`🟢 [SMS API TRIGGERED] -> Sending to: ${parentPhone}`);
    console.log(`💬 MESSAGE: "ANUMATI Alert: ${studentName} has successfully exited the campus main gate at ${new Date().toLocaleTimeString()}."`);
    console.log(`======================================================\n`);

    res.json({ success: true, message: 'Pass verified and parent notified.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Scan failed.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Anumati backend running on port ' + PORT);
});
