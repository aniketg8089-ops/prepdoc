const db = require('./database.js');
const bcrypt = require('bcryptjs');

db.serialize(() => {
  // Clear existing data
  db.run('DELETE FROM users');
  db.run('DELETE FROM tests');
  db.run('DELETE FROM subjects');
  db.run('DELETE FROM questions');
  db.run('DELETE FROM user_results');

  // ===== INSERT ADMIN USER - UPDATED EMAIL =====
  const adminPassword = bcrypt.hashSync('alphacode@8080', 10);
  db.run(
    'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
    ['Aniket Gupta', 'aniket808089@gmail.com', adminPassword, 1]
  );

  // ===== INSERT DEMO USER =====
  const demoPassword = bcrypt.hashSync('password123', 10);
  db.run(
    'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
    ['Demo User', 'demo@prepdoc.com', demoPassword, 0]
  );

  // ===== INSERT SUBJECTS =====
  const subjects = [
    ['Physics', 'fa-atom', 3120],
    ['Chemistry', 'fa-flask', 2980],
    ['Biology', 'fa-leaf', 4520]
  ];

  subjects.forEach(subject => {
    db.run(
      'INSERT INTO subjects (name, icon, question_count) VALUES (?, ?, ?)',
      subject
    );
  });

  // ===== INSERT TESTS =====
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

  tests.forEach(test => {
    db.run(
      'INSERT INTO tests (title, badge, badge_color, duration, question_count, description, is_free, category, subject) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      test
    );
  });

  console.log('✅ PrepDOC database initialized with sample data!');
  console.log('📊 Sample Data:');
  console.log('   - Admin: Aniket Gupta (aniket808089@gmail.com / alphacode@8080)');
  console.log('   - Demo: demo@prepdoc.com / password123');
  console.log('   - Subjects: 3 (Physics, Chemistry, Biology)');
  console.log('   - Tests: 11');
  db.close();
});