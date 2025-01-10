const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const Database = require('better-sqlite3');
const fetch = require('node-fetch').default;

const BATCH_SIZE = 1000; // Process files in batches of 1000
const NUM_WORKERS = Math.max(1, require('os').cpus().length - 1); // Use all CPUs except one

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(process.cwd(), 'public', 'games.db');

function getDatabase() {
  try {
    return new Database(DB_PATH);
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
}

async function fetchGameInfo() {
  try {
    // Fetch working.json and titles_db.txt in parallel
    const [workingResponse, titlesResponse] = await Promise.all([
      fetch('https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json'),
      fetch('https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt')
    ]);

    const workingData = await workingResponse.json();
    const titlesText = await titlesResponse.text();

    // Parse titles_db.txt
    const titleInfo = {};
    titlesText.split('\n').forEach(line => {
      const [tid, releaseDate, name, size] = line.split('|');
      if (tid && releaseDate && name) {
        titleInfo[tid] = { name, releaseDate, size: parseInt(size, 10) };
      }
    });

    // Combine both sources
    const gameInfo = {};
    
    // First, add data from working.json
    Object.entries(workingData).forEach(([tid, data]) => {
      gameInfo[tid] = {
        name: data['Game Name'],
        version: data['Version'],
        size: data['Size'],
      };
    });

    // Then supplement with titles_db.txt data
    Object.entries(titleInfo).forEach(([tid, data]) => {
      if (!gameInfo[tid]) {
        gameInfo[tid] = {
          name: data.name,
          size: data.size,
        };
      }
      // Add release date even if we already have other info
      gameInfo[tid].releaseDate = data.releaseDate;
    });

    return gameInfo;
  } catch (error) {
    console.error('Error fetching game info:', error);
    return {};
  }
}

async function initializeDatabase() {
  // Ensure public directory exists
  await fsPromises.mkdir(path.dirname(DB_PATH), { recursive: true });
  
  const db = getDatabase();
  
  // Create tables and indexes
  const statements = [
    `CREATE TABLE IF NOT EXISTS games (
      tid TEXT PRIMARY KEY,
      name TEXT,
      version TEXT,
      size INTEGER,
      release_date TEXT,
      is_base BOOLEAN,
      is_update BOOLEAN,
      is_dlc BOOLEAN,
      base_tid TEXT,
      total_downloads INTEGER,
      last_updated TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS downloads (
      tid TEXT,
      date TEXT,
      count INTEGER,
      PRIMARY KEY (tid, date),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    `CREATE TABLE IF NOT EXISTS global_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_72h INTEGER NOT NULL DEFAULT 0,
      last_7d INTEGER NOT NULL DEFAULT 0,
      last_30d INTEGER NOT NULL DEFAULT 0,
      all_time INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL
    )`,

    `INSERT OR IGNORE INTO global_stats (id, last_72h, last_7d, last_30d, all_time, last_updated)
    VALUES (1, 0, 0, 0, 0, datetime('now'))`,

    `CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(date)`,
    `CREATE INDEX IF NOT EXISTS idx_games_base ON games(is_base)`,
    `CREATE INDEX IF NOT EXISTS idx_games_downloads ON games(total_downloads)`
  ];

  // Execute each statement separately
  for (const sql of statements) {
    db.prepare(sql).run();
  }

  return db;
}

async function calculatePeriodStats(db) {
  console.log('\nCalculating global statistics...');
  const startTime = performance.now();
  
  // Calculate period downloads and rankings for all games
  db.prepare(`
    WITH period_stats AS (
      SELECT
        (SELECT SUM(count) FROM downloads WHERE date >= date('now', '-3 days')) as last_72h,
        (SELECT SUM(count) FROM downloads WHERE date >= date('now', '-7 days')) as last_7d,
        (SELECT SUM(count) FROM downloads WHERE date >= date('now', '-30 days')) as last_30d,
        (SELECT SUM(total_downloads) FROM games) as all_time
      FROM downloads
    )
    UPDATE global_stats
    SET 
      last_72h = COALESCE((SELECT last_72h FROM period_stats), 0),
      last_7d = COALESCE((SELECT last_7d FROM period_stats), 0), 
      last_30d = COALESCE((SELECT last_30d FROM period_stats), 0),
      all_time = COALESCE((SELECT all_time FROM period_stats), 0),
      last_updated = datetime('now')
    WHERE id = 1;
  `).run();

  // Log the results
  const stats = db.prepare('SELECT * FROM global_stats WHERE id = 1').get();
  if (stats) {
    const formatNumber = num => Number(num || 0).toLocaleString();
    console.log('\nGlobal Statistics:');
    console.log(`- Last 72h: ${formatNumber(stats.last_72h)} downloads`);
    console.log(`- Last 7d: ${formatNumber(stats.last_7d)} downloads`);
    console.log(`- Last 30d: ${formatNumber(stats.last_30d)} downloads`);
    console.log(`- All time: ${formatNumber(stats.all_time)} downloads`);
    console.log(`- Last updated: ${stats.last_updated}`);
  } else {
    console.log('\nWarning: No global statistics available');
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nStatistics calculated in ${duration}s`);
}

async function processBatch(db, files, gameInfo, startIdx) {
  try {
    const endIdx = Math.min(startIdx + BATCH_SIZE, files.length);
    const batchFiles = files.slice(startIdx, endIdx);

    // Begin transaction for the batch
    const transaction = db.transaction(() => {
      const insertGame = db.prepare(`
        INSERT OR REPLACE INTO games (
          tid, name, version, size, release_date, is_base, is_update, is_dlc,
          base_tid, total_downloads, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertDownload = db.prepare(`
        INSERT OR REPLACE INTO downloads (tid, date, count)
        VALUES (?, ?, ?)
      `);

      for (const file of batchFiles) {
        if (!file.endsWith('_downloads.json')) continue;

        const filePath = path.join(DATA_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = JSON.parse(content);
        const tid = file.replace('_downloads.json', '');

        // Insert game
        insertGame.run([
          tid,
          gameInfo[tid]?.name || null,
          gameInfo[tid]?.version || null,
          gameInfo[tid]?.size || null,
          gameInfo[tid]?.releaseDate || null,
          tid.endsWith('000') ? 1 : 0,
          tid.endsWith('800') ? 1 : 0,
          (!tid.endsWith('000') && !tid.endsWith('800')) ? 1 : 0,
          tid.endsWith('000') ? null : `${tid.slice(0, 12)}000`,
          stats.total_downloads || 0,
          new Date().toISOString()
        ].map(v => v === undefined ? null : v));

        // Insert downloads
        Object.entries(stats.per_date).forEach(([date, count]) => {
          insertDownload.run(tid, date, count);
        });
      }
    });

    // Execute transaction
    transaction();

    const progress = ((endIdx / files.length) * 100).toFixed(1);
    console.log(`Progress: ${progress}% (${endIdx}/${files.length})`);

    return endIdx;
  } catch (error) {
    console.error(`Error processing batch starting at ${startIdx}:`, error);
    throw error;
  }
}

async function indexGames() {
  console.log('🚀 Starting indexing process...');
  const startTime = performance.now();
  
  let db;
  try {
    db = await initializeDatabase();
    
    // Get list of files and game info in parallel
    const [files, gameInfo] = await Promise.all([
      fsPromises.readdir(DATA_DIR),
      fetchGameInfo()
    ]);

    const jsonFiles = files.filter(file => file.endsWith('_downloads.json'));
    console.log(`Found ${jsonFiles.length} JSON files to process`);

    // Process files in batches
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
      await processBatch(db, jsonFiles, gameInfo, i);
    }

    await calculatePeriodStats(db);

    // Log statistics
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Get stats
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM games').get().count;
    const baseGames = db.prepare('SELECT COUNT(*) as count FROM games WHERE is_base = 1').get().count;
    const totalDownloads = db.prepare('SELECT SUM(total_downloads) as sum FROM games').get().sum || 0;

    console.log('\n✨ Final Statistics:');
    console.log(`- Indexing duration: ${duration} seconds`);
    console.log(`- Total games indexed: ${totalGames}`);
    console.log(`- Base games: ${baseGames}`);
    console.log(`- Total downloads: ${totalDownloads.toLocaleString()}`);
    console.log(`- Database location: ${DB_PATH}`);

  } catch (error) {
    console.error('\n❌ Fatal error during indexing:', error);
    process.exit(1);
  }
}

// Run indexer
indexGames();