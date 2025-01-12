const { HOME_PAGE_LIMIT } = require('../constants');

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

module.exports = {
  calculateHomePageRankings
};