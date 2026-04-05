import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'habitsync.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    points INTEGER DEFAULT 340,
    streak INTEGER DEFAULT 12,
    best_streak INTEGER DEFAULT 19
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    cat TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    recur TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    mood_score INTEGER,
    screen_time REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

export default db;
