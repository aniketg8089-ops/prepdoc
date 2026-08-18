const db = require('./database.js');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    try {
        console.log('📦 Initializing PostgreSQL database...');

        // Insert admin user
        const adminPassword = bcrypt.hashSync('alphacode@8080', 10);
        await db.run(
            `INSERT INTO users (name, email, password, is_admin) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (email) DO NOTHING`,
            ['Aniket Gupta', 'aniket808089@gmail.com', adminPassword, 1]
        );

        // Insert demo user
        const demoPassword = bcrypt.hashSync('password123', 10);
        await db.run(
            `INSERT INTO users (name, email, password, is_admin) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (email) DO NOTHING`,
            ['Demo User', 'demo@prepdoc.com', demoPassword, 0]
        );

        // Insert subjects
        const subjects = [
            ['Physics', 'fa-atom', 3120],
            ['Chemistry', 'fa-flask', 2980],
            ['Biology', 'fa-leaf', 4520]
        ];

        for (const subject of subjects) {
            await db.run(
                `INSERT INTO subjects (name, icon, question_count) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (name) DO NOTHING`,
                subject
            );
        }

        // Insert tests
        const tests = [
            ['Physics Chapter 1: Basic Mathematics', 'Physics', 'badge', '30m', 10, 'Practice basic mathematics for NEET', 1, 'chapterwise', 'Physics'],
            ['Physics Chapter 2: Units & Measurements', 'Physics', 'badge', '30m', 10, 'Practice units and measurements', 1, 'chapterwise', 'Physics'],
            ['Physics Chapter 3: Motion in a Straight Line', 'Physics', 'badge', '30m', 10, 'Practice motion in straight line', 1, 'chapterwise', 'Physics'],
            ['Chemistry Chapter 1: Basic Concepts', 'Chemistry', 'badge', '30m', 10, 'Practice basic chemistry concepts', 1, 'chapterwise', 'Chemistry'],
            ['Chemistry Chapter 2: Structure of Atom', 'Chemistry', 'badge', '30m', 10, 'Practice atomic structure', 1, 'chapterwise', 'Chemistry'],
            ['Biology Chapter 1: Living World', 'Biology', 'badge', '30m', 10, 'Practice living world concepts', 1, 'chapterwise', 'Biology'],
            ['Biology Chapter 2: Biological Classification', 'Biology', 'badge', '30m', 10, 'Practice biological classification', 1, 'chapterwise', 'Biology'],
            ['Weekly Test 1', 'Weekly', 'green', '1h', 50, 'Weekly test for all subjects', 1, 'weekly', 'All'],
            ['Weekly Test 2', 'Weekly', 'green', '1h', 50, 'Weekly test for all subjects', 1, 'weekly', 'All'],
            ['Full Syllabus Mock 1', 'Full Syllabus', 'orange', '3h 20m', 200, 'Complete NEET mock test', 1, 'full', 'All'],
            ['Full Syllabus Mock 2', 'Full Syllabus', 'orange', '3h 20m', 200, 'Complete NEET mock test', 1, 'full', 'All']
        ];

        for (const test of tests) {
            await db.run(
                `INSERT INTO tests (title, badge, badge_color, duration, question_count, description, is_free, category, subject) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                 ON CONFLICT (title) DO NOTHING`,
                test
            );
        }

        console.log('✅ PrepDOC database initialized successfully!');
        console.log('📊 Sample Data:');
        console.log('   - Admin: Aniket Gupta (aniket808089@gmail.com / alphacode@8080)');
        console.log('   - Demo: demo@prepdoc.com / password123');
        console.log('   - Subjects: 3 (Physics, Chemistry, Biology)');
        console.log('   - Tests: 11');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        process.exit(1);
    }
}

initDatabase();