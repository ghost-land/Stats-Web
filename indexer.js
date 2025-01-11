const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');
const fetch = require('node-fetch').default;

const BATCH_SIZE = 1000; // Process files in batches of 1000

// Periods for the rankings
const PERIODS = Object.freeze(['72h', '7d', '30d', 'all']);
const CONTENT_TYPES = Object.freeze(['base', 'update', 'dlc']);
const HOME_PAGE_LIMIT = 12;

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

// Calculate rankings for a specific period and content type
async function calculatePeriodRankings(db, period, contentType) {
  console.log(`\nCalculating rankings for period: ${period}, type: ${contentType || 'all'}`);
  const startTime = performance.now();

  const transaction = db.transaction(() => {
    // Calculate current period downloads for each game
    const currentPeriodQuery = period === 'all' 
      ? `
        SELECT tid, total_downloads as downloads
        FROM games
        WHERE ${contentType === 'base' ? 'is_base = 1' : contentType === 'update' ? 'is_update = 1' : 'is_dlc = 1'}
      `
      : `
        SELECT 
          g.tid,
          COALESCE(SUM(d.count), 0) as downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        WHERE date >= date('now', '-${period === '72h' ? '3' : period === '7d' ? '7' : '30'} days')
        AND ${contentType === 'base' ? 'g.is_base = 1' : contentType === 'update' ? 'g.is_update = 1' : 'g.is_dlc = 1'}
        GROUP BY g.tid
      `;

    // Calculate previous period downloads
    const previousPeriodQuery = period === 'all'
      ? currentPeriodQuery
      : `
        SELECT 
          g.tid,
          COALESCE(SUM(d.count), 0) as downloads
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        WHERE date >= date('now', '-${period === '72h' ? '6' : period === '7d' ? '14' : '60'} days')
          AND date < date('now', '-${period === '72h' ? '3' : period === '7d' ? '7' : '30'} days')
        AND ${contentType === 'base' ? 'g.is_base = 1' : contentType === 'update' ? 'g.is_update = 1' : 'g.is_dlc = 1'}
        GROUP BY g.tid
      `;

    // Get current and previous downloads
    const currentDownloads = db.prepare(currentPeriodQuery).all();
    const previousDownloads = db.prepare(previousPeriodQuery).all();

    // Create maps for easy lookup
    const currentDownloadsMap = new Map(
      currentDownloads.map(row => [row.tid, row.downloads])
    );
    const previousDownloadsMap = new Map(
      previousDownloads.map(row => [row.tid, row.downloads])
    );

    // Sort games by downloads to get rankings
    const currentRankings = currentDownloads
      .sort((a, b) => b.downloads - a.downloads)
      .map((row, index) => ({
        tid: row.tid,
        rank: index + 1,
        downloads: row.downloads
      }));

    const previousRankings = previousDownloads
      .sort((a, b) => b.downloads - a.downloads)
      .map((row, index) => ({
        tid: row.tid,
        rank: index + 1,
        downloads: row.downloads
      }));

    // Create maps for easy lookup
    const currentRankingsMap = new Map(
      currentRankings.map(r => [r.tid, r])
    );
    const previousRankingsMap = new Map(
      previousRankings.map(r => [r.tid, r])
    );

    // Clear current rankings for this period and type
    db.prepare(`
      DELETE FROM current_rankings 
      WHERE period = ? AND content_type = ?
    `).run(period, contentType);

    // Insert rankings history
    const insertRankingHistory = db.prepare(`
      INSERT INTO rankings_history (
        tid,
        period,
        content_type,
        rank,
        downloads,
        date
      ) VALUES (?, ?, ?, ?, ?, date('now'))
    `);

    // Insert new rankings for each game
    for (const [tid, current] of currentRankingsMap) {
      const previous = previousRankingsMap.get(tid);
      
      db.prepare(`
        INSERT INTO current_rankings (
          tid,
          period,
          content_type,
          rank,
          previous_rank,
          rank_change,
          downloads,
          previous_downloads,
          last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        tid,
        period,
        contentType,
        current.rank,
        previous?.rank || null,
        previous ? previous.rank - current.rank : 0,
        current.downloads,
        previous?.downloads || 0
      );

      // Insert into rankings history
      insertRankingHistory.run(
        tid,
        period,
        contentType,
        current.rank,
        current.downloads
      );
    }
  });

  // Execute transaction
  transaction();

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nRankings calculated in ${duration}s`);
}

async function initializeDatabase() {
  // Ensure public directory exists
  await fsPromises.mkdir(path.dirname(DB_PATH), { recursive: true });
  
  const db = getDatabase();
  
  // Drop existing rankings tables to recreate with new schema
  const dropStatements = [
    `DROP TABLE IF EXISTS rankings_history`,
    `DROP TABLE IF EXISTS current_rankings`
  ];

  // Drop home page rankings table if it exists
  dropStatements.push(`DROP TABLE IF EXISTS home_page_rankings`);

  // Execute drop statements
  for (const sql of dropStatements) {
    db.prepare(sql).run();
  }

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

    // Rankings history table
    `CREATE TABLE IF NOT EXISTS rankings_history (
      tid TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      content_type TEXT NOT NULL CHECK (content_type IN ('base', 'update', 'dlc')),
      rank INTEGER NOT NULL,
      downloads INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (tid, period, content_type, date),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    // Current rankings table
    `CREATE TABLE IF NOT EXISTS current_rankings (
      tid TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      content_type TEXT NOT NULL CHECK (content_type IN ('base', 'update', 'dlc')),
      rank INTEGER NOT NULL,
      previous_rank INTEGER,
      rank_change INTEGER,
      downloads INTEGER NOT NULL,
      previous_downloads INTEGER,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (tid, period, content_type),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    // Home page rankings table
    `CREATE TABLE IF NOT EXISTS home_page_rankings (
      tid TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      rank INTEGER NOT NULL,
      downloads INTEGER NOT NULL,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (tid, period),
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
    `CREATE INDEX IF NOT EXISTS idx_games_downloads ON games(total_downloads)`,
    `CREATE INDEX IF NOT EXISTS idx_rankings_history_date ON rankings_history(date)`,
    `CREATE INDEX IF NOT EXISTS idx_rankings_history_period ON rankings_history(period)`,
    `CREATE INDEX IF NOT EXISTS idx_rankings_history_type ON rankings_history(content_type)`,
    `CREATE INDEX IF NOT EXISTS idx_current_rankings_period ON current_rankings(period)`,
    `CREATE INDEX IF NOT EXISTS idx_current_rankings_type ON current_rankings(content_type)`,
    `CREATE INDEX IF NOT EXISTS idx_current_rankings_rank ON current_rankings(rank)`,
    `CREATE INDEX IF NOT EXISTS idx_home_page_rankings_period ON home_page_rankings(period)`,
    `CREATE INDEX IF NOT EXISTS idx_home_page_rankings_rank ON home_page_rankings(rank)`
  ];

  // Execute each statement separately
  for (const sql of statements) {
    db.prepare(sql).run();
  }

  return db;
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

async function calculatePeriodStats(db) {
  console.log('\nCalculating global statistics...');
  const startTime = performance.now();

  // Calculate period stats with evolution percentages and update global stats
  const globalStats = db.prepare(`
    WITH period_stats AS (
      SELECT
        SUM(CASE WHEN date >= date('now', '-3 days') THEN count ELSE 0 END) as last_72h,
        SUM(CASE WHEN date >= date('now', '-7 days') THEN count ELSE 0 END) as last_7d,
        SUM(CASE WHEN date >= date('now', '-30 days') THEN count ELSE 0 END) as last_30d,
        (SELECT SUM(total_downloads) FROM games) as all_time,
        SUM(CASE WHEN date >= date('now', '-6 days') AND date < date('now', '-3 days') THEN count ELSE 0 END) as prev_72h,
        SUM(CASE WHEN date >= date('now', '-14 days') AND date < date('now', '-7 days') THEN count ELSE 0 END) as prev_7d,
        SUM(CASE WHEN date >= date('now', '-60 days') AND date < date('now', '-30 days') THEN count ELSE 0 END) as prev_30d
      FROM downloads
    )
    SELECT 
      last_72h,
      last_7d,
      last_30d,
      all_time,
      CASE 
        WHEN prev_72h > 0 THEN ROUND(((last_72h - prev_72h) * 100.0 / prev_72h), 1)
        ELSE 0 
      END as evolution_72h,
      CASE 
        WHEN prev_7d > 0 THEN ROUND(((last_7d - prev_7d) * 100.0 / prev_7d), 1)
        ELSE 0 
      END as evolution_7d,
      CASE 
        WHEN prev_30d > 0 THEN ROUND(((last_30d - prev_30d) * 100.0 / prev_30d), 1)
        ELSE 0 
      END as evolution_30d
    FROM period_stats
  `).get();
  
  // Update global stats with evolution percentages
  db.prepare(`
    UPDATE global_stats
    SET
      last_72h = ?,
      last_7d = ?,
      last_30d = ?,
      all_time = ?,
      last_updated = datetime('now')
    WHERE id = 1
  `).run(
    globalStats.last_72h || 0,
    globalStats.last_7d || 0,
    globalStats.last_30d || 0,
    globalStats.all_time || 0,
  );

  // Log the results
  const currentStats = db.prepare('SELECT * FROM global_stats WHERE id = 1').get();
  if (currentStats) {
    const formatNumber = num => Number(num || 0).toLocaleString();
    console.log('\nGlobal Statistics:');
    console.log(`- Last 72h: ${formatNumber(currentStats.last_72h)} downloads (${globalStats.evolution_72h > 0 ? '+' : ''}${globalStats.evolution_72h}%)`);
    console.log(`- Last 7d: ${formatNumber(currentStats.last_7d)} downloads (${globalStats.evolution_7d > 0 ? '+' : ''}${globalStats.evolution_7d}%)`);
    console.log(`- Last 30d: ${formatNumber(currentStats.last_30d)} downloads (${globalStats.evolution_30d > 0 ? '+' : ''}${globalStats.evolution_30d}%)`);
    console.log(`- All time: ${formatNumber(currentStats.all_time)} downloads`);
    console.log(`- Last updated: ${currentStats.last_updated}`);
  } else {
    console.log('\nWarning: No global statistics available');
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nStatistics calculated in ${duration}s`);
}

// Calculate home page rankings for a specific period
async function calculateHomePageRankings(db, period) {
  console.log(`\nCalculating home page rankings for period: ${period}`);
  const startTime = performance.now();

  const transaction = db.transaction(() => {
    // Get top 12 base games for the period
    const query = period === 'all'
      ? `
        SELECT 
          g.tid,
          g.total_downloads as downloads,
          ROW_NUMBER() OVER (ORDER BY g.total_downloads DESC) as rank
        FROM games g
        WHERE g.is_base = 1
        ORDER BY g.total_downloads DESC
        LIMIT ${HOME_PAGE_LIMIT}
      `
      : `
        WITH period_downloads AS (
          SELECT 
            g.tid,
            COALESCE(SUM(d.count), 0) as downloads
          FROM games g
          LEFT JOIN downloads d ON g.tid = d.tid
          WHERE g.is_base = 1
          AND date >= date('now', ?)
          GROUP BY g.tid
        )
        SELECT 
          pd.tid,
          pd.downloads,
          ROW_NUMBER() OVER (ORDER BY pd.downloads DESC) as rank
        FROM period_downloads pd
        ORDER BY pd.downloads DESC
        LIMIT ${HOME_PAGE_LIMIT}
      `;

    // Clear existing home page rankings for this period
    db.prepare('DELETE FROM home_page_rankings WHERE period = ?').run(period);

    // Insert new rankings
    const insertHomePageRanking = db.prepare(`
      INSERT INTO home_page_rankings (
        tid,
        period,
        rank,
        downloads,
        last_updated
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const results = period === 'all'
      ? db.prepare(query).all()
      : db.prepare(query).all(`-${period === '72h' ? '3' : period === '7d' ? '7' : '30'} days`);

    for (const row of results) {
      insertHomePageRanking.run(
        row.tid,
        period,
        row.rank,
        row.downloads
      );
    }
  });

  // Execute transaction
  transaction();

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nHome page rankings calculated in ${duration}s`);
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

    // Calculate rankings for each content type
    for (const period of PERIODS) {
      await calculatePeriodRankings(db, period, 'base');
      await calculatePeriodRankings(db, period, 'update');
      await calculatePeriodRankings(db, period, 'dlc');
    }

    // Calculate home page rankings for each period
    for (const period of PERIODS) {
      await calculateHomePageRankings(db, period);
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