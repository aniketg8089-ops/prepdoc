const { Pool } = require('pg');

// ⚠️ REPLACE WITH YOUR ACTUAL DATABASE_URL
const DATABASE_URL = "postgresql://prepdoc_user:BzPCIeyIq78zJC1FdubxsNrLMltSPFtx@dpg-da1q4bflk1mc73a3v4c0-a.oregon-postgres.render.com/prepdoc";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
    try {
        console.log('📦 Connecting to PostgreSQL...');
        
        // 1. Check if test_chapters table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'test_chapters'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('📦 Creating test_chapters table...');
            await pool.query(`
                CREATE TABLE test_chapters (
                    id SERIAL PRIMARY KEY,
                    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                    chapter_name TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ test_chapters table created!');
        } else {
            console.log('✅ test_chapters table already exists');
        }

        // 2. Check if category column type is TEXT
        const columnCheck = await pool.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tests' AND column_name = 'category'
        `);
        
        console.log('Category column type:', columnCheck.rows[0]?.data_type);

        // 3. Fix category column if needed
        if (columnCheck.rows[0]?.data_type !== 'text') {
            console.log('📦 Changing category column to TEXT...');
            await pool.query(`
                ALTER TABLE tests ALTER COLUMN category TYPE TEXT
            `);
            console.log('✅ Category column changed to TEXT');
        }

        // 4. Check if there are any tests
        const tests = await pool.query('SELECT id, title, category::text FROM tests');
        console.log(`📊 Found ${tests.rows.length} tests`);
        console.table(tests.rows);

        // 5. Test the weekly query
        console.log('📦 Testing weekly query...');
        const weeklyTests = await pool.query(`
            SELECT 
                t.*,
                COALESCE(
                    (SELECT json_agg(json_build_object('name', tc.chapter_name, 'subject', tc.subject)) 
                     FROM test_chapters tc WHERE tc.test_id = t.id),
                    '[]'::json
                ) as chapters
            FROM tests t 
            WHERE t.category::text = 'weekly'
            ORDER BY t.created_at DESC
        `);
        console.log(`✅ Weekly tests: ${weeklyTests.rows.length}`);
        console.table(weeklyTests.rows);

        console.log('✅ Database fix completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

fixDatabase();