const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'prepdoc.db'));

// ===== CREATE TABLES =====
db.serialize(() => {
  // Users table - with is_admin column
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tests table
  db.run(`
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      badge TEXT,
      badge_color TEXT,
      duration TEXT,
      question_count INTEGER,
      description TEXT,
      is_free INTEGER DEFAULT 1,
      category TEXT DEFAULT 'chapterwise',
      subject TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Subjects table
  db.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      question_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Questions table
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (test_id) REFERENCES tests(id)
    )
  `);

  // User results table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      test_id INTEGER,
      score INTEGER,
      total_questions INTEGER,
      correct INTEGER,
      wrong INTEGER,
      percentage REAL,
      answers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (test_id) REFERENCES tests(id)
    )
  `);

  console.log('✅ Database tables created successfully!');
});

module.exports = db;