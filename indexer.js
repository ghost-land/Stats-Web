const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');
const fetch = require('node-fetch').default;

// Constants
const BATCH_SIZES = {
  FILES: 1000,    // Process files in batches of 1000
  GAMES: 1000     // Process games in batches of 1000
};
const HOME_PAGE_LIMIT = 12; // Number of games to show on home page

// Analytics constants
const PERIODS = ['72h', '7d', '30d', 'all'];
const CONTENT_TYPES = ['base', 'update', 'dlc'];
const ANALYTICS_PERIODS = {
  '72h': { days: 3, prevDays: 6 },
  '7d': { days: 7, prevDays: 14 },
  '30d': { days: 30, prevDays: 60 }
};

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(process.cwd(), 'public', 'games.db');

function getDatabase() {
  try {
    const db = new Database(DB_PATH);
    
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

async function processBatch(db, files, gameInfo, startIdx) {
  try {
    const endIdx = Math.min(startIdx + BATCH_SIZES.FILES, files.length);
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
    console.log(`📊 Progress: ${progress}% (${endIdx}/${files.length})`);

    return endIdx;
  } catch (error) {
    console.error(`❌ Error processing batch starting at ${startIdx}:`, error);
    throw error;
  }
}

async function calculateAnalytics(db) {
  console.log('\n📈 Calculating analytics...');
  const startTime = performance.now();
  
  // Calculate global stats first
  const globalStats = db.prepare(`
    WITH period_stats AS (
      SELECT
        SUM(CASE WHEN date >= date('now', '-3 days') THEN count ELSE 0 END) as last_72h,
        SUM(CASE WHEN date >= date('now', '-7 days') THEN count ELSE 0 END) as last_7d,
        SUM(CASE WHEN date >= date('now', '-30 days') THEN count ELSE 0 END) as last_30d,
        SUM(count) as all_time,
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

  // Update global stats
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
    globalStats.all_time || 0
  );

  const transaction = db.transaction(() => {
    // Calculate daily analytics
    db.prepare(`DELETE FROM analytics_daily`).run();
    db.prepare(`
      INSERT INTO analytics_daily (
        date,
        total_downloads,
        unique_games,
        data_transferred,
        base_downloads,
        update_downloads,
        dlc_downloads,
        base_data,
        update_data,
        dlc_data
      )
      SELECT
        d.date,
        SUM(d.count) as total_downloads,
        COUNT(DISTINCT d.tid) as unique_games,
        SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred,
        SUM(CASE WHEN g.is_base = 1 THEN d.count ELSE 0 END) as base_downloads,
        SUM(CASE WHEN g.is_update = 1 THEN d.count ELSE 0 END) as update_downloads,
        SUM(CASE WHEN g.is_dlc = 1 THEN d.count ELSE 0 END) as dlc_downloads,
        SUM(CASE WHEN g.is_base = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as base_data,
        SUM(CASE WHEN g.is_update = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as update_data,
        SUM(CASE WHEN g.is_dlc = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as dlc_data
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      GROUP BY d.date
      ORDER BY d.date
    `).run();

    // Calculate weekly analytics
    db.prepare(`DELETE FROM analytics_weekly`).run();
    db.prepare(`
      WITH raw_weekly AS (
        SELECT
          CAST(strftime('%Y', date) AS INTEGER) as year,
          CAST(strftime('%W', date) AS INTEGER) + 1 as week,
          SUM(d.count) as total_downloads,
          SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred
        FROM downloads d
        JOIN games g ON d.tid = g.tid
        GROUP BY year, week
      )
      INSERT INTO analytics_weekly (year, week, total_downloads, data_transferred)
      SELECT
        year,
        CASE 
          WHEN week > 53 THEN 53  -- Cap at week 53
          WHEN week < 1 THEN 1    -- Ensure minimum week is 1
          ELSE week 
        END as week,
        total_downloads,
        data_transferred
      FROM raw_weekly
      ORDER BY year, week
    `).run();

    // Calculate monthly analytics
    db.prepare(`DELETE FROM analytics_monthly`).run();
    db.prepare(`
      INSERT INTO analytics_monthly (year, month, total_downloads, data_transferred)
      SELECT
        CAST(strftime('%Y', date) AS INTEGER) as year,
        CAST(strftime('%m', date) AS INTEGER) as month,
        SUM(d.count) as total_downloads,
        SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred
      FROM downloads d
      JOIN games g ON d.tid = g.tid
      GROUP BY year, month
      ORDER BY year, month
    `).run();

    // Calculate period stats for each content type
    db.prepare(`DELETE FROM analytics_period_stats`).run();
    
    for (const period of PERIODS) {
      for (const contentType of [...CONTENT_TYPES, 'all']) {
        const typeCondition = contentType === 'all' ? '1=1' :
          contentType === 'base' ? 'g.is_base = 1' :
          contentType === 'update' ? 'g.is_update = 1' :
          'g.is_dlc = 1';

        const periodCondition = period === 'all' ? '1=1' :
          `date >= date('now', '-${ANALYTICS_PERIODS[period].days} days')`;

        // Calculate previous period for growth rate
        const prevPeriodCondition = period === 'all' ? '1=1' : 
          `date >= date('now', '-${ANALYTICS_PERIODS[period].prevDays} days') 
           AND date < date('now', '-${ANALYTICS_PERIODS[period].days} days')`;

        // Calculate current and previous period totals
        const periodTotals = db.prepare(`
          WITH current_period AS (
            SELECT COALESCE(SUM(d.count), 0) as current_total
            FROM downloads d
            JOIN games g ON d.tid = g.tid
            WHERE ${periodCondition}
            AND ${typeCondition}
          ),
          previous_period AS (
            SELECT COALESCE(SUM(d.count), 0) as previous_total
            FROM downloads d
            JOIN games g ON d.tid = g.tid
            WHERE ${prevPeriodCondition}
            AND ${typeCondition}
          )
          SELECT 
            current_period.current_total,
            previous_period.previous_total,
            CASE 
              WHEN previous_period.previous_total > 0 
              THEN ROUND(((current_period.current_total - previous_period.previous_total) * 100.0 / previous_period.previous_total), 1)
              ELSE 0 
            END as growth_rate
          FROM current_period, previous_period
        `).get();

        db.prepare(`
          INSERT INTO analytics_period_stats (
            period,
            content_type,
            total_downloads,
            data_transferred,
            unique_items,
            growth_rate,
            last_updated
          )
          SELECT
            ? as period,
            ? as content_type,
            COALESCE(SUM(d.count), 0) as total_downloads,
            COALESCE(SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)), 0) as data_transferred,
            COUNT(DISTINCT d.tid) as unique_items,
            ? as growth_rate,
            datetime('now') as last_updated
          FROM downloads d
          JOIN games g ON d.tid = g.tid
          WHERE ${periodCondition}
          AND ${typeCondition} 
        `).run(period, contentType, periodTotals.growth_rate);
      }
    }
  });

  // Execute transaction
  transaction();

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Analytics calculated in ${duration}s`);
}

async function calculatePeriodRankings(db, period, contentType) {
  console.log(`\n🏆 Calculating rankings for period: ${period}, type: ${contentType}`);
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
      INSERT OR REPLACE INTO rankings_history (
        tid,
        period,
        content_type,
        rank,
        downloads,
        date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Insert new rankings for each game
    for (const [tid, current] of currentRankingsMap) {
      const previous = previousRankingsMap.get(tid);
      const today = new Date().toISOString().split('T')[0];
      
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
      // Check if we already have a record for today
      const existingRecord = db.prepare(`
        SELECT 1 FROM rankings_history 
        WHERE tid = ? AND period = ? AND content_type = ? AND date = ?
      `).get(tid, period, contentType, today);

      if (!existingRecord) {
        insertRankingHistory.run(
          tid,
          period,
          contentType,
          current.rank,
          current.downloads,
          today
        );
      }
    }

    // Log some statistics
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_rankings,
        COUNT(CASE WHEN rank_change > 0 THEN 1 END) as moved_up,
        COUNT(CASE WHEN rank_change < 0 THEN 1 END) as moved_down,
        COUNT(CASE WHEN rank_change = 0 THEN 1 END) as no_change
      FROM current_rankings
      WHERE period = ? AND content_type = ?
    `).get(period, contentType);

    console.log(`\n📊 Rankings statistics for ${period} (${contentType}):`);
    console.log(`📈 Total rankings: ${stats.total_rankings}`);
    console.log(`⬆️  Moved up: ${stats.moved_up}`);
    console.log(`⬇️  Moved down: ${stats.moved_down}`);
    console.log(`➡️  No change: ${stats.no_change}`);

    // Log biggest changes
    const topChanges = db.prepare(`
      SELECT tid, rank, previous_rank, rank_change, content_type
      FROM current_rankings
      WHERE period = ? AND content_type = ? AND rank_change != 0
      ORDER BY ABS(rank_change) DESC
      LIMIT 5
    `).all(period, contentType);

    console.log('\n🔄 Biggest ranking changes:');
    topChanges.forEach(change => {
      console.log(`🎮 ${change.tid} (${change.content_type}): ${change.previous_rank} → ${change.rank} (${change.rank_change > 0 ? '+' : ''}${change.rank_change})`);
    });
  });

  // Execute transaction
  transaction();

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Rankings calculated in ${duration}s`);
}

async function calculateHomePageRankings(db, period) {
  console.log(`\n🏠 Calculating home page rankings for period: ${period}`);
  const startTime = performance.now();
  const limit = HOME_PAGE_LIMIT;

  const transaction = db.transaction(() => {
    // Get top 12 base games for the period
    const query = period === 'all'
      ? `
        SELECT 
          g.*,
          g.total_downloads as downloads,
          ROW_NUMBER() OVER (ORDER BY g.total_downloads DESC) as rank,
          json_group_object(date, d.count) as per_date
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid
        WHERE g.is_base = 1
        GROUP BY g.tid
        ORDER BY g.total_downloads DESC, g.tid ASC
        LIMIT ${HOME_PAGE_LIMIT}
      `
      : `
        SELECT 
          g.*,
          COALESCE(SUM(d.count), 0) as downloads,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(d.count), 0) DESC) as rank,
          json_group_object(date, d.count) as per_date
        FROM games g
        LEFT JOIN downloads d ON g.tid = d.tid AND date >= date('now', ?)
        WHERE g.is_base = 1
        GROUP BY g.tid
        ORDER BY downloads DESC, g.tid ASC
        LIMIT ${limit}
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
  console.log(`\n✨ Home page rankings calculated in ${duration}s`);
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

    // Analytics tables
    `CREATE TABLE IF NOT EXISTS analytics_daily (
      date TEXT NOT NULL,
      total_downloads INTEGER NOT NULL DEFAULT 0,
      unique_games INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      base_downloads INTEGER NOT NULL DEFAULT 0,
      update_downloads INTEGER NOT NULL DEFAULT 0,
      dlc_downloads INTEGER NOT NULL DEFAULT 0,
      base_data INTEGER NOT NULL DEFAULT 0,
      update_data INTEGER NOT NULL DEFAULT 0,
      dlc_data INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date)
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_weekly (
      year INTEGER NOT NULL,
      week INTEGER NOT NULL CHECK (week >= 1 AND week <= 53),
      total_downloads INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year, week)
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_monthly (
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
      total_downloads INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year, month)
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_period_stats (
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      content_type TEXT NOT NULL CHECK (content_type IN ('base', 'update', 'dlc', 'all')),
      total_downloads INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      unique_items INTEGER NOT NULL DEFAULT 0,
      growth_rate REAL DEFAULT 0,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (period, content_type)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_weekly_year ON analytics_weekly(year)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_monthly_year ON analytics_monthly(year)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_period_stats_period ON analytics_period_stats(period)`,

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
    console.log(`📁 Found ${jsonFiles.length} JSON files to process`);

    // Process files in batches
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZES.FILES) {
      await processBatch(db, jsonFiles, gameInfo, i);
    }

    // Calculate analytics first
    await calculateAnalytics(db);

    // Calculate rankings for each content type
    console.log('🏆 Calculating rankings...');
    const startTime = performance.now();

    // Calculate rankings for each period and content type
    for (const period of PERIODS) {
      for (const contentType of CONTENT_TYPES) {
        await calculatePeriodRankings(db, period, contentType);
      }
    }
    
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ All rankings calculated in ${duration}s`);
    
    // Calculate home page rankings
    console.log('🏠 Calculating home page rankings...');
    await calculateHomePageRankings(db, '72h');
    await calculateHomePageRankings(db, '7d'); 
    await calculateHomePageRankings(db, '30d');
    await calculateHomePageRankings(db, 'all');

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Indexing completed in ${totalDuration}s`);

  } catch (error) {
    console.error('❌ Error during indexing:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Start indexing
indexGames();