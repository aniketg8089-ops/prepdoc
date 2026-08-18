const { Pool } = require('pg');

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required!');
    console.log('💡 Please set DATABASE_URL in Render environment variables');
    process.exit(1);
}

// Create connection pool
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err);
        return;
    }
    console.log('✅ Connected to PostgreSQL successfully!');
    release();
});

// ===== CREATE TABLES =====
async function createTables() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tests (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                badge TEXT,
                badge_color TEXT,
                duration TEXT,
                question_count INTEGER,
                description TEXT,
                is_free INTEGER DEFAULT 1,
                category TEXT DEFAULT 'chapterwise',
                subject TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Subjects table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                question_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Questions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                test_id INTEGER,
                question_text TEXT,
                option_a TEXT,
                option_b TEXT,
                option_c TEXT,
                option_d TEXT,
                correct_answer TEXT,
                explanation TEXT,
                difficulty TEXT,
                year INTEGER,
                chapter TEXT,
                question_type TEXT DEFAULT 'normal',
                statement_1 TEXT,
                statement_2 TEXT,
                assertion TEXT,
                reason TEXT,
                image_data TEXT,
                section_type TEXT DEFAULT 'testseries',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (test_id) REFERENCES tests(id)
            )
        `);

        // User results table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_results (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                test_id INTEGER,
                score INTEGER,
                total_questions INTEGER,
                correct INTEGER,
                wrong INTEGER,
                percentage REAL,
                answers TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (test_id) REFERENCES tests(id)
            )
        `);

        // ===== TEST CHAPTERS TABLE (NEW) =====
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_chapters (
                id SERIAL PRIMARY KEY,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                chapter_name TEXT NOT NULL,
                subject TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create index for faster queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_test_chapters_test_id ON test_chapters(test_id)
        `);

        console.log('✅ PostgreSQL tables created successfully!');
        console.log('   - users');
        console.log('   - tests');
        console.log('   - subjects');
        console.log('   - questions');
        console.log('   - user_results');
        console.log('   - test_chapters (NEW)');
    } catch (err) {
        console.error('❌ Error creating tables:', err);
    }
}

createTables();

// ============================================
// ===== DATABASE WRAPPER =====
// ============================================

const db = {
    // For queries that return a single row
    get: async (sql, params) => {
        try {
            const result = await pool.query(sql, params);
            return result.rows[0] || null;
        } catch (err) {
            console.error('❌ Error in get:', err);
            throw err;
        }
    },
    
    // For queries that return multiple rows
    all: async (sql, params) => {
        try {
            const result = await pool.query(sql, params);
            return result.rows;
        } catch (err) {
            console.error('❌ Error in all:', err);
            throw err;
        }
    },
    
    // For INSERT/UPDATE/DELETE queries
    run: async (sql, params) => {
        try {
            const result = await pool.query(sql, params);
            return { lastID: result.rows[0]?.id || null };
        } catch (err) {
            console.error('❌ Error in run:', err);
            throw err;
        }
    },
    
    // For running multiple queries in sequence
    serialize: async (callback) => {
        try {
            if (callback) await callback();
        } catch (err) {
            console.error('❌ Error in serialize:', err);
            throw err;
        }
    },
    
    // Raw pool for advanced queries
    pool: pool
};

module.exports = db;