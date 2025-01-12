const fs = require('fs');
const path = require('path');

async function processBatch(db, files, gameInfo, startIdx, DATA_DIR, BATCH_SIZES) {
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

module.exports = {
  processBatch
};