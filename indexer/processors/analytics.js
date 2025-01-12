const { PERIODS, CONTENT_TYPES, ANALYTICS_PERIODS } = require('../constants');

// Calculate daily statistics
async function calculateDailyStats(db, period) {
  const periodCondition = period === 'all' ? '1=1' :
    `date >= date('now', '-${ANALYTICS_PERIODS[period].days} days')`;

  return db.prepare(`
    SELECT
      d.date,
      SUM(d.count) as total_downloads,
      COUNT(DISTINCT d.tid) as unique_games,
      SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred
    FROM downloads d
    JOIN games g ON d.tid = g.tid
    WHERE ${periodCondition}
    GROUP BY d.date
    ORDER BY d.date
  `).all();
}

// Calculate monthly statistics
async function calculateMonthlyStats(db, period) {
  const periodCondition = period === 'all' ? '1=1' :
    `date >= date('now', '-${ANALYTICS_PERIODS[period].days} days')`;

  return db.prepare(`
    SELECT
      strftime('%Y', date) as year,
      strftime('%m', date) as month,
      SUM(d.count) as total_downloads,
      SUM(CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER)) as data_transferred
    FROM downloads d
    JOIN games g ON d.tid = g.tid
    WHERE ${periodCondition}
    GROUP BY year, month
    ORDER BY year, month
  `).all();
}

// Calculate game type statistics
async function calculateGameTypeStats(db, period) {
  const periodCondition = period === 'all' ? '1=1' :
    `date >= date('now', '-${ANALYTICS_PERIODS[period].days} days')`;

  return db.prepare(`
    SELECT
      SUM(CASE WHEN g.is_base = 1 THEN d.count ELSE 0 END) as base_downloads,
      SUM(CASE WHEN g.is_update = 1 THEN d.count ELSE 0 END) as update_downloads,
      SUM(CASE WHEN g.is_dlc = 1 THEN d.count ELSE 0 END) as dlc_downloads,
      SUM(CASE WHEN g.is_base = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as base_data_transferred,
      SUM(CASE WHEN g.is_update = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as update_data_transferred,
      SUM(CASE WHEN g.is_dlc = 1 THEN CAST(d.count AS INTEGER) * CAST(COALESCE(g.size, 0) AS INTEGER) ELSE 0 END) as dlc_data_transferred,
      COUNT(DISTINCT CASE WHEN g.is_base = 1 THEN g.tid END) as unique_base_games,
      COUNT(DISTINCT CASE WHEN g.is_update = 1 THEN g.tid END) as unique_updates,
      COUNT(DISTINCT CASE WHEN g.is_dlc = 1 THEN g.tid END) as unique_dlc
    FROM downloads d
    JOIN games g ON d.tid = g.tid
    WHERE ${periodCondition}
  `).get();
}

// Pre-calculate analytics for each period and cache them
async function precalculateAnalytics(db, period) {
  console.log(`\n📊 Pre-calculating analytics for period: ${period}`);

  const analytics = {
    daily_stats: await calculateDailyStats(db, period),
    monthly_stats: await calculateMonthlyStats(db, period),
    game_type_stats: await calculateGameTypeStats(db, period)
  };

  // Cache the results
  db.prepare(`
    INSERT OR REPLACE INTO analytics_cache (
      period,
      data,
      created_at
    ) VALUES (?, ?, datetime('now'))
  `).run(
    period,
    JSON.stringify(analytics)
  );

  return analytics;
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

  // Pre-calculate analytics for each period
  for (const period of PERIODS) {
    await precalculateAnalytics(db, period);
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Analytics calculated in ${duration}s`);
}

module.exports = {
  calculateAnalytics,
  precalculateAnalytics,
  calculateDailyStats,
  calculateMonthlyStats,
  calculateGameTypeStats
};