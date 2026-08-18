const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'prepdoc_secret_key_2026';

// ============================================
// ===== CORS - Allow multiple origins =====
// ============================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://prepdoc.vercel.app',
  'https://prepdoc-git-main.vercel.app',
  'https://prepdoc.vercel.app',
  'https://prepdoc-api.onrender.com',
  'https://prepdoc-y4k3.onrender.com',
  'https://prepdoc-online.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('âš ï¸ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// ===== CLOUDINARY CONFIGURATION =====
// ============================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'xrnz5hip',
    api_key: process.env.CLOUDINARY_API_KEY || '985884485219864',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'fTIrRr63KOt_aBX-_oVSdUaxtwU'
});

// ===== CLOUDINARY STORAGE =====
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'prepdoc_images',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
        transformation: [{ width: 800, height: 600, crop: 'limit' }]
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================
// ===== FRONTEND SERVE (for local) =====
// ============================================
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
    console.log('ðŸ“ Frontend served from:', frontendPath);
} else {
    console.log('âš ï¸ Frontend folder not found at:', frontendPath);
    app.get('/', (req, res) => {
        res.json({ 
            message: 'PrepDOC API Server', 
            version: '2.0.0',
            endpoints: {
                auth: '/api/signup, /api/login',
                tests: '/api/tests',
                questions: '/api/questions',
                admin: '/api/admin/*'
            }
        });
    });
}

// ============================================
// ===== AUTH ROUTES =====
// ============================================

app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        // Check if user exists
        const existingUser = await db.get('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const isAdmin = (email === 'aniket808089@gmail.com' && password === 'alphacode@8080');
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const result = await db.run(
            'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, hashedPassword, isAdmin ? 1 : 0]
        );
        
        const userId = result.lastID;
        const token = jwt.sign({ id: userId, email, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: userId, name, email, isAdmin } });
    } catch (err) {
        console.error('âŒ Signup error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });
        
        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) return res.status(400).json({ error: 'Invalid email or password' });
        
        const token = jwt.sign({ 
            id: user.id, 
            email: user.email,
            isAdmin: user.is_admin || 0
        }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                isAdmin: user.is_admin || 0
            } 
        });
    } catch (err) {
        console.error('âŒ Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== AUTH MIDDLEWARE =====
// ============================================

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ============================================
// ===== TEST ROUTES =====
// ============================================

app.get('/api/tests', async (req, res) => {
    const { category, subject } = req.query;
    let query = 'SELECT * FROM tests';
    const params = [];
    const conditions = [];
    if (category) { conditions.push('category = $' + (params.length + 1)); params.push(category); }
    if (subject) { conditions.push('subject = $' + (params.length + 1)); params.push(subject); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    try {
        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tests/:id', async (req, res) => {
    const testId = req.params.id;
    try {
        const test = await db.get('SELECT * FROM tests WHERE id = $1', [testId]);
        if (!test) { res.status(404).json({ error: 'Test not found' }); return; }
        const questions = await db.all('SELECT * FROM questions WHERE test_id = $1', [testId]);
        res.json({ ...test, questions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/questions', async (req, res) => {
    const { subject_id, section_type, chapter, year } = req.query;
    let query = 'SELECT q.*, s.name as subject_name FROM questions q LEFT JOIN subjects s ON q.subject_id = s.id';
    const params = [];
    const conditions = [];
    if (subject_id) { conditions.push('q.subject_id = $' + (params.length + 1)); params.push(subject_id); }
    if (section_type) { conditions.push('q.section_type = $' + (params.length + 1)); params.push(section_type); }
    if (chapter) { conditions.push('q.chapter = $' + (params.length + 1)); params.push(chapter); }
    if (year) { conditions.push('q.year = $' + (params.length + 1)); params.push(year); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    query += ' ORDER BY q.id DESC';
    try {
        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/subjects', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM subjects ORDER BY id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/practice/random', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const section = req.query.section || 'practice';
    try {
        const rows = await db.all(
            'SELECT * FROM questions WHERE section_type = $1 ORDER BY RANDOM() LIMIT $2',
            [section, limit]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== SUBMIT TEST =====
// ============================================

app.post('/api/tests/:id/submit', authenticate, async (req, res) => {
    const testId = req.params.id;
    const userId = req.user.id;
    const { answers } = req.body;
    if (!answers) {
        return res.status(400).json({ error: 'Answers are required' });
    }
    try {
        const questions = await db.all('SELECT id, correct_answer FROM questions WHERE test_id = $1', [testId]);
        let correct = 0;
        let wrong = 0;
        const result = [];
        questions.forEach(q => {
            const userAnswer = answers[q.id] || '';
            const isCorrect = userAnswer === q.correct_answer;
            if (isCorrect) correct++;
            else if (userAnswer) wrong++;
            result.push({
                questionId: q.id,
                correctAnswer: q.correct_answer,
                userAnswer: userAnswer || 'Not attempted',
                isCorrect
            });
        });
        const total = questions.length;
        const percentage = ((correct / total) * 100).toFixed(1);
        const insertResult = await db.run(
            `INSERT INTO user_results 
             (user_id, test_id, score, total_questions, correct, wrong, percentage, answers) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [userId, testId, correct, total, correct, wrong, percentage, JSON.stringify(answers)]
        );
        res.json({
            testId,
            total,
            correct,
            wrong,
            percentage,
            resultId: insertResult.lastID,
            details: result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user/results', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        const rows = await db.all(
            `SELECT r.*, t.title as test_name 
             FROM user_results r 
             JOIN tests t ON r.test_id = t.id 
             WHERE r.user_id = $1 
             ORDER BY r.created_at DESC`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== ADMIN ROUTES =====
// ============================================

app.get('/api/admin/questions', authenticate, requireAdmin, async (req, res) => {
    const { section_type, subject_id, chapter, year } = req.query;
    let query = `SELECT q.*, s.name as subject_name 
                 FROM questions q 
                 LEFT JOIN subjects s ON q.subject_id = s.id`;
    const params = [];
    const conditions = [];
    if (section_type) { conditions.push('q.section_type = $' + (params.length + 1)); params.push(section_type); }
    if (subject_id) { conditions.push('q.subject_id = $' + (params.length + 1)); params.push(subject_id); }
    if (chapter) { conditions.push('q.chapter = $' + (params.length + 1)); params.push(chapter); }
    if (year) { conditions.push('q.year = $' + (params.length + 1)); params.push(year); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    query += ' ORDER BY q.id DESC';
    try {
        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== BULK IMAGE UPLOAD (Cloudinary) =====
// ============================================
app.post('/api/admin/bulk-image-questions',
    authenticate, 
    requireAdmin,
    upload.array('images', 50),
    async (req, res) => {
    try {
        const imageFiles = req.files || [];
        const { section, subject, chapter, year, difficulty, timer_minutes } = req.body;

        console.log(`ðŸ“¸ ${imageFiles.length} images uploaded to Cloudinary by admin`);
        console.log(`â±ï¸ Timer: ${timer_minutes || 30} minutes`);

        if (imageFiles.length === 0) {
            return res.status(400).json({ error: 'At least one image is required' });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Create a test entry for this bulk upload
        let testId = null;
        if (section === 'testseries') {
            const subjectName = subject === '1' ? 'Physics' : subject === '2' ? 'Chemistry' : 'Biology';
            const testTitle = `${subjectName} - ${chapter}`;
            const timerValue = parseInt(timer_minutes) || 30;
            const duration = `${timerValue}m`;
            
            const result = await db.run(
                `INSERT INTO tests (title, badge, badge_color, duration, question_count, description, is_free, category, subject) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [testTitle, 'Bulk Upload', 'badge', duration, imageFiles.length, `Bulk uploaded questions for ${chapter}`, 1, 'chapterwise', subjectName]
            );
            testId = result.lastID;
            console.log(`âœ… Test created with ID: ${testId}, Duration: ${duration}`);
        }

        for (let i = 0; i < imageFiles.length; i++) {
            const imageUrl = imageFiles[i].path;

            const qText = null;
            const optA = 'A';
            const optB = 'B';
            const optC = 'C';
            const optD = 'D';
            const correct = req.body[`correct_${i}`] || '';
            const explanation = req.body[`explanation_${i}`] || '';

            if (!correct) {
                errorCount++;
                errors.push(`Image ${i+1}: Correct answer is required`);
                continue;
            }

            const sql = `INSERT INTO questions 
                (subject_id, test_id, question_text, option_a, option_b, option_c, option_d, 
                 correct_answer, explanation, difficulty, year, chapter, 
                 question_type, image_data, section_type) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;

            const params = [
                parseInt(subject) || null,
                testId || null,
                qText,
                optA,
                optB,
                optC,
                optD,
                correct,
                explanation || null,
                difficulty || 'Easy',
                parseInt(year) || 2025,
                chapter,
                'image',
                imageUrl,
                section
            ];

            try {
                await db.run(sql, params);
                successCount++;
                console.log(`âœ… Question ${i+1} added with Cloudinary image: ${imageUrl}`);
            } catch (err) {
                errorCount++;
                errors.push(`Row ${i+1}: ${err.message}`);
            }
        }

        // Update test question count
        if (testId && successCount > 0) {
            await db.run('UPDATE tests SET question_count = $1 WHERE id = $2', [successCount, testId]);
        }

        res.json({
            success: true,
            total: imageFiles.length,
            successCount: successCount,
            errorCount: errorCount,
            testId: testId,
            errors: errors.slice(0, 10)
        });

    } catch (err) {
        console.error('Bulk image upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== DELETE QUESTION - Protected =====
app.delete('/api/admin/questions/:id', authenticate, requireAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const question = await db.get('SELECT * FROM questions WHERE id = $1', [id]);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        await db.run('DELETE FROM questions WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Question deleted successfully!'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const stats = {};
        const totalQ = await db.get('SELECT COUNT(*) as total FROM questions');
        stats.totalQuestions = totalQ.total;
        const testQ = await db.get('SELECT COUNT(*) as total FROM questions WHERE section_type = "testseries"');
        stats.testSeriesQuestions = testQ.total;
        const practiceQ = await db.get('SELECT COUNT(*) as total FROM questions WHERE section_type = "practice"');
        stats.practiceQuestions = practiceQ.total;
        const pyqQ = await db.get('SELECT COUNT(*) as total FROM questions WHERE section_type = "pyqs"');
        stats.pyqQuestions = pyqQ.total;
        const users = await db.get('SELECT COUNT(*) as total FROM users');
        stats.totalUsers = users.total;
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== ADMIN - GET ALL USERS =====
// ============================================
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT id, name, email, is_admin, created_at FROM users ORDER BY id DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('âŒ Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== ADMIN - DELETE USER =====
// ============================================
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
    const id = req.params.id;
    
    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    try {
        await db.run('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true, message: 'User deleted successfully!' });
    } catch (err) {
        console.error('âŒ Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== ADMIN - UPDATE USER ROLE =====
// ============================================
app.put('/api/admin/users/:id/role', authenticate, requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { is_admin } = req.body;
    
    // Prevent changing your own role
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    try {
        await db.run('UPDATE users SET is_admin = $1 WHERE id = $2', [is_admin, id]);
        res.json({ success: true, message: 'User role updated successfully!' });
    } catch (err) {
        console.error('âŒ Error updating user role:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ===== HEALTH CHECK =====
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// ===== ERROR HANDLING =====
// ============================================
app.use((err, req, res, next) => {
    console.error('âŒ Error:', err);
    res.status(500).json({ 
        error: err.message || 'Internal server error',
        success: false
    });
});

// ============================================
// ===== START SERVER =====
// ============================================

    // ============================================
    // ===== AUTO-INITIALIZE DATABASE =====
    // ============================================
    async function initializeDatabase() {
        try {
            const admin = await db.get('SELECT * FROM users WHERE email = ', ['aniket808089@gmail.com']);
            if (!admin) {
                console.log('📦 No users found, initializing database...');
                try {
                    require('./init-db.js');
                } catch (initErr) {
                    console.error('❌ Error running init-db.js:', initErr.message);
                }
            } else {
                console.log('✅ Database already initialized');
            }
        } catch (err) {
            console.error('❌ Error checking database:', err);
        }
    }

    initializeDatabase();


app.listen(PORT, () => {
    console.log(`ðŸ©º PrepDOC Server running at http://localhost:${PORT}`);
    console.log(`ðŸ“š API Endpoints:`);
    console.log(`   ðŸ” Auth: POST /api/signup, POST /api/login`);
    console.log(`   ðŸ“ Tests: GET /api/tests, GET /api/tests/:id`);
    console.log(`   ðŸ“š Questions: GET /api/questions`);
    console.log(`   ðŸ”§ Admin (Protected):`);
    console.log(`      GET  /api/admin/questions`);
    console.log(`      POST /api/admin/bulk-image-questions`);
    console.log(`      DELETE /api/admin/questions/:id`);
    console.log(`   ðŸ“‚ Subjects: GET /api/subjects`);
    console.log(`   ðŸ¥ Health: GET /api/health`);
    console.log(`ðŸ“¸ Cloudinary: ${cloudinary.config().cloud_name}`);
    console.log(`ðŸ‘‘ Admin: aniket808089@gmail.com`);
    console.log(`ðŸŒ CORS allowed origins:`, allowedOrigins);
});