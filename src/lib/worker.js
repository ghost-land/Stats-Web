const { parentPort } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite3').verbose();

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(process.cwd(), 'data', 'games.db');

// Create or open SQLite database
const db = new sqlite3.Database(DB_PATH);

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS games (
    tid TEXT PRIMARY KEY,
    name TEXT,
    version TEXT,
    size INTEGER,
    release_date TEXT,
    total_downloads INTEGER,
    last_updated TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS downloads (
    tid TEXT,
    date TEXT,
    count INTEGER,
    PRIMARY KEY (tid, date),
    FOREIGN KEY (tid) REFERENCES games(tid)
  )`);
});

async function processFile(file) {
  if (!file.endsWith('_downloads.json')) return null;

  try {
    const filePath = path.join(DATA_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');
    const stats = JSON.parse(content);
    const tid = file.replace('_downloads.json', '');

    // Insert or update game data
    db.run(`
      INSERT OR REPLACE INTO games (tid, total_downloads, last_updated)
      VALUES (?, ?, datetime('now'))
    `, [tid, stats.total_downloads]);

    // Insert download history
    const stmt = db.prepare('INSERT OR REPLACE INTO downloads (tid, date, count) VALUES (?, ?, ?)');
    Object.entries(stats.per_date).forEach(([date, count]) => {
      stmt.run(tid, date, count);
    });
    stmt.finalize();

    return { tid, stats };
  } catch (error) {
    console.error(`Error processing file ${file}:`, error);
    return null;
  }
}

async function indexGames() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(file => file.endsWith('_downloads.json'));
    
    for (const file of jsonFiles) {
      await processFile(file);
      // Report progress
      if (parentPort) {
        parentPort.postMessage({ 
          type: 'progress',
          total: jsonFiles.length,
          current: jsonFiles.indexOf(file) + 1
        });
      }
    }

    // Report completion
    if (parentPort) {
      parentPort.postMessage({ type: 'complete' });
    }
  } catch (error) {
    console.error('Indexing error:', error);
    if (parentPort) {
      parentPort.postMessage({ type: 'error', error: error.message });
    }
  }
}

// Start indexing
indexGames();