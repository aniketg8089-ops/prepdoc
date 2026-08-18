const express = require('express');
const cors = require('cors');
const path = require('path');

// ✅ FIX: Rebuild SQLite3 for Linux (Render)
try {
    require('sqlite3');
    console.log('✅ SQLite3 loaded successfully');
} catch (e) {
    console.log('⚠️ SQLite3 error, rebuilding for Linux...');
    const { execSync } = require('child_process');
    try {
        execSync('npm rebuild sqlite3', { stdio: 'inherit' });
        console.log('✅ SQLite3 rebuilt successfully');
    } catch (rebuildErr) {
        console.error('❌ Failed to rebuild SQLite3:', rebuildErr.message);
    }
}

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
  'https://prepdoc-y4k3.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
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
// ===== DATABASE INITIALIZATION =====
// ============================================
const dbPath = path.join(__dirname, 'prepdoc.db');

// Check if database exists, if not, run init
if (!fs.existsSync(dbPath)) {
    console.log('📦 Database not found, initializing...');
    try {
        require('./init-db.js');
        console.log('✅ Database initialized successfully!');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
}

// Add is_admin column if not exists
db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.log('is_admin column already exists');
    }
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
    console.log('📁 Frontend served from:', frontendPath);
} else {
    console.log('⚠️ Frontend folder not found at:', frontendPath);
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

app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const isAdmin = (email === 'aniket808089@gmail.com' && password === 'alphacode@8080');
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
        'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, isAdmin ? 1 : 0],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            const token = jwt.sign({ id: this.lastID, email, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: this.lastID, name, email, isAdmin } });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
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
    });
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

app.get('/api/tests', (req, res) => {
    const { category, subject } = req.query;
    let query = 'SELECT * FROM tests';
    const params = [];
    const conditions = [];
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (subject) { conditions.push('subject = ?'); params.push(subject); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    db.all(query, params, (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.get('/api/tests/:id', (req, res) => {
    const testId = req.params.id;
    db.get('SELECT * FROM tests WHERE id = ?', [testId], (err, test) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!test) { res.status(404).json({ error: 'Test not found' }); return; }
        db.all('SELECT * FROM questions WHERE test_id = ?', [testId], (err, questions) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({ ...test, questions });
        });
    });
});

app.get('/api/questions', (req, res) => {
    const { subject_id, section_type, chapter, year } = req.query;
    let query = 'SELECT q.*, s.name as subject_name FROM questions q LEFT JOIN subjects s ON q.subject_id = s.id';
    const params = [];
    const conditions = [];
    if (subject_id) { conditions.push('q.subject_id = ?'); params.push(subject_id); }
    if (section_type) { conditions.push('q.section_type = ?'); params.push(section_type); }
    if (chapter) { conditions.push('q.chapter = ?'); params.push(chapter); }
    if (year) { conditions.push('q.year = ?'); params.push(year); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    query += ' ORDER BY q.id DESC';
    db.all(query, params, (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.get('/api/subjects', (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY id', (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.get('/api/practice/random', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const section = req.query.section || 'practice';
    db.all(
        'SELECT * FROM questions WHERE section_type = ? ORDER BY RANDOM() LIMIT ?',
        [section, limit],
        (err, rows) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json(rows);
        }
    );
});

// ============================================
// ===== SUBMIT TEST =====
// ============================================

app.post('/api/tests/:id/submit', authenticate, (req, res) => {
    const testId = req.params.id;
    const userId = req.user.id;
    const { answers } = req.body;
    if (!answers) {
        return res.status(400).json({ error: 'Answers are required' });
    }
    db.all('SELECT id, correct_answer FROM questions WHERE test_id = ?', [testId], (err, questions) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
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
        db.run(
            `INSERT INTO user_results 
             (user_id, test_id, score, total_questions, correct, wrong, percentage, answers) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, testId, correct, total, correct, wrong, percentage, JSON.stringify(answers)],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({
                    testId,
                    total,
                    correct,
                    wrong,
                    percentage,
                    resultId: this.lastID,
                    details: result
                });
            }
        );
    });
});

app.get('/api/user/results', authenticate, (req, res) => {
    const userId = req.user.id;
    db.all(
        `SELECT r.*, t.title as test_name 
         FROM user_results r 
         JOIN tests t ON r.test_id = t.id 
         WHERE r.user_id = ? 
         ORDER BY r.created_at DESC`,
        [userId],
        (err, rows) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json(rows);
        }
    );
});

// ============================================
// ===== ADMIN ROUTES =====
// ============================================

app.get('/api/admin/questions', authenticate, requireAdmin, (req, res) => {
    const { section_type, subject_id, chapter, year } = req.query;
    let query = `SELECT q.*, s.name as subject_name 
                 FROM questions q 
                 LEFT JOIN subjects s ON q.subject_id = s.id`;
    const params = [];
    const conditions = [];
    if (section_type) { conditions.push('q.section_type = ?'); params.push(section_type); }
    if (subject_id) { conditions.push('q.subject_id = ?'); params.push(subject_id); }
    if (chapter) { conditions.push('q.chapter = ?'); params.push(chapter); }
    if (year) { conditions.push('q.year = ?'); params.push(year); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    query += ' ORDER BY q.id DESC';
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching questions:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
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

        console.log(`📸 ${imageFiles.length} images uploaded to Cloudinary by admin`);
        console.log(`⏱️ Timer: ${timer_minutes || 30} minutes`);

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
            
            await new Promise((resolve) => {
                db.run(
                    `INSERT INTO tests (title, badge, badge_color, duration, question_count, description, is_free, category, subject) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [testTitle, 'Bulk Upload', 'badge', duration, imageFiles.length, `Bulk uploaded questions for ${chapter}`, 1, 'chapterwise', subjectName],
                    function(err) {
                        if (!err) {
                            testId = this.lastID;
                            console.log(`✅ Test created with ID: ${testId}, Duration: ${duration}`);
                        } else {
                            console.error('❌ Error creating test:', err);
                        }
                        resolve();
                    }
                );
            });
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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

            await new Promise((resolve) => {
                db.run(sql, params, function(err) {
                    if (err) {
                        errorCount++;
                        errors.push(`Row ${i+1}: ${err.message}`);
                    } else {
                        successCount++;
                        console.log(`✅ Question ${i+1} added with Cloudinary image: ${imageUrl}`);
                    }
                    resolve();
                });
            });
        }

        // Update test question count
        if (testId && successCount > 0) {
            db.run('UPDATE tests SET question_count = ? WHERE id = ?', [successCount, testId]);
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
app.delete('/api/admin/questions/:id', authenticate, requireAdmin, (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM questions WHERE id = ?', [id], (err, question) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                success: true,
                message: 'Question deleted successfully!'
            });
        });
    });
});

app.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => {
    const stats = {};
    db.get('SELECT COUNT(*) as total FROM questions', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalQuestions = row.total;
        db.get('SELECT COUNT(*) as total FROM questions WHERE section_type = "testseries"', (err, row) => {
            stats.testSeriesQuestions = row.total;
            db.get('SELECT COUNT(*) as total FROM questions WHERE section_type = "practice"', (err, row) => {
                stats.practiceQuestions = row.total;
                db.get('SELECT COUNT(*) as total FROM questions WHERE section_type = "pyqs"', (err, row) => {
                    stats.pyqQuestions = row.total;
                    db.get('SELECT COUNT(*) as total FROM users', (err, row) => {
                        stats.totalUsers = row.total;
                        res.json(stats);
                    });
                });
            });
        });
    });
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
    console.error('❌ Error:', err);
    res.status(500).json({ 
        error: err.message || 'Internal server error',
        success: false
    });
});

// ============================================
// ===== START SERVER =====
// ============================================

app.listen(PORT, () => {
    console.log(`🩺 PrepDOC Server running at http://localhost:${PORT}`);
    console.log(`📚 API Endpoints:`);
    console.log(`   🔐 Auth: POST /api/signup, POST /api/login`);
    console.log(`   📝 Tests: GET /api/tests, GET /api/tests/:id`);
    console.log(`   📚 Questions: GET /api/questions`);
    console.log(`   🔧 Admin (Protected):`);
    console.log(`      GET  /api/admin/questions`);
    console.log(`      POST /api/admin/bulk-image-questions`);
    console.log(`      DELETE /api/admin/questions/:id`);
    console.log(`   📂 Subjects: GET /api/subjects`);
    console.log(`   🏥 Health: GET /api/health`);
    console.log(`📸 Cloudinary: ${cloudinary.config().cloud_name}`);
    console.log(`👑 Admin: aniket808089@gmail.com`);
    console.log(`🌍 CORS allowed origins:`, allowedOrigins);
});