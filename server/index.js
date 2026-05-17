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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── Health Checks (Fixes the Render 404 Error) ────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Anumati Backend is live!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', server: 'Anumati Backend', time: new Date() });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', server: 'Anumati Backend', port: process.env.PORT || 3001 });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: db ? 'connected' : 'disconnected' });
});

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
        return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
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
        return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
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
      return res.status(404).json({ error: 'Account not registered. Please sign up first.' });
    }

    // Verify password
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    // Return user object
    res.json(user);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Auth: Signup ─────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    const userId = 'stu_' + Date.now() + Math.random().toString(36).substring(2, 7);

    await db.query(
      'INSERT INTO users (id, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, password, 'student', phone || null]
    );

    const newUser = {
      id: userId,
      name,
      email,
      role: 'student',
      phone: phone || null,
      avatar: null,
      department: null,
      roomNumber: null,
      usn: null
    };

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup.' });
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
    const { id } = req.params;
    const updates = req.body || {};

    // Whitelist ONLY valid database columns that can be updated
    const allowedFields = ['avatar', 'name', 'phone', 'usn', 'roomNumber', 'address', 'department', 'hostelBlock'];
    
    const filteredUpdates = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const keys = Object.keys(filteredUpdates);

    console.log(`📝 Update request for user ${id}:`);
    console.log(`   Received fields:`, Object.keys(updates));
    console.log(`   Blocked fields:`, Object.keys(updates).filter(k => !allowedFields.includes(k)));
    console.log(`   Allowed fields:`, keys);

    if (keys.length === 0) {
      console.log(`⚠️ No valid updatable fields provided for user ${id}`);
      return res.status(400).json({ error: 'No valid fields to update. Blocked: uid, id, role, email, parentPhone' });
    }

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(filteredUpdates), id];
    const sql = 'UPDATE users SET ' + setClause + ' WHERE id = ?';

    console.log(`🔄 Executing SQL: ${sql}`);
    const [result] = await db.query(sql, values);
    
    if (result.affectedRows === 0) {
      console.log(`❌ User not found: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Updated ${result.affectedRows} row(s) for user ${id}`);
    
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    console.log(`📤 Returning updated user:`, rows[0]);
    res.json(rows[0]);
  } catch (error) {
    console.error('🔴 Update user error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
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
// POST /api/security/scan  - Process a scanned pass and log entry/exit
app.post('/api/security/scan', async (req, res) => {
  const { passId, studentName, studentId, passType, parentPhone, verifiedBy } = req.body;

  try {
    // Validate required fields
    if (!passId || !studentId || !studentName) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Determine log type based on pass type
    // Entry passes are logged as 'IN', others as 'OUT'
    const logType = passType === 'Entry' ? 'IN' : 'OUT';
    const logId = 'log_' + Date.now() + Math.random().toString(36).substring(2, 7);

    // Insert into security_logs
    await db.query(
      'INSERT INTO security_logs (id, studentId, studentName, type, timestamp, gate, verifiedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [logId, studentId, studentName, logType, new Date().toISOString(), 'Main Gate', verifiedBy || 'Guard']
    );

    // Log to console for testing/debugging
    console.log(`\n======================================================`);
    console.log(`🟢 [GATE ACCESS LOGGED] ${logType}`);
    console.log(`📌 Student: ${studentName} (${studentId})`);
    console.log(`🎫 Pass Type: ${passType}`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`======================================================\n`);

    // Send SMS notification if parent phone provided
    if (parentPhone) {
      const action = logType === 'IN' ? 'entered' : 'exited';
      console.log(`\n📧 [SMS NOTIFICATION] -> ${parentPhone}`);
      console.log(`💬 MESSAGE: "ANUMATI Alert: ${studentName} has ${action} the campus main gate at ${new Date().toLocaleTimeString()}."`);
    }

    res.json({ success: true, message: `Pass scanned. Logged as ${logType}.`, logId });
  } catch (error) {
    console.error('Security scan error:', error);
    res.status(500).json({ success: false, message: 'Scan failed.' });
  }
});

// ─── Admin: Wipe All Data ─────────────────────────────────────────────────────
app.post('/api/admin/wipe-all-data', async (req, res) => {
  try {
    // Delete all leaves
    await db.query('DELETE FROM leaves');
    
    // Delete all security logs
    await db.query('DELETE FROM security_logs');
    
    // Delete all OTPs
    await db.query('DELETE FROM otps');
    
    // Delete all student users (role = 'student')
    await db.query("DELETE FROM users WHERE role = 'student'");
    
    res.json({ success: true, message: 'All data wiped successfully' });
  } catch (error) {
    console.error('Wipe all data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', method: req.method, path: req.path });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Uncaught error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Anumati backend running on port ' + PORT);
});
