const Database = require('better-sqlite3');
const path = require('path');

function getDatabase(dbPath) {
  try {
    const db = new Database(dbPath);
    
    // Enable optimizations
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -32000'); // Use 32MB of cache
    db.pragma('temp_store = MEMORY');
    db.pragma('busy_timeout = 30000');
    db.pragma('mmap_size = 30000000000');
    db.pragma('page_size = 4096');
    db.pragma('threads = 4');
    db.pragma('read_uncommitted = 0');
    db.pragma('foreign_keys = ON');
    db.pragma('auto_vacuum = INCREMENTAL');
    db.pragma('secure_delete = OFF');
    db.pragma('locking_mode = NORMAL');
    db.pragma('cache_spill = OFF');
    db.pragma('recursive_triggers = OFF');
    db.pragma('reverse_unordered_selects = OFF');
    db.pragma('checkpoint_fullfsync = OFF');
    db.pragma('trusted_schema = OFF');
    db.pragma('wal_autocheckpoint = 1000');
    db.pragma('wal_checkpoint(PASSIVE)');

    return db;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
}

module.exports = {
  getDatabase
};