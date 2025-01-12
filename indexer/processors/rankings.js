const { PERIODS, CONTENT_TYPES } = require('../constants');

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
      console.log(`🎮 ${change.tid} (${change.content_type}): ${change.previous_rank} → ${change.rank} (${change.rank_change > 0 ? '+' : ''}${change.rank_change })`);
    });
  });

  // Execute transaction
  transaction();

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Rankings calculated in ${duration}s`);
}

module.exports = {
  calculatePeriodRankings
};