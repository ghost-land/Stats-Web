const fs = require('fs').promises;
const path = require('path');

// Import modules
const { BATCH_SIZES, PERIODS, CONTENT_TYPES } = require('./indexer/constants');
const { DB_PATH, getDatabase } = require('./indexer/database');
const { initializeDatabase } = require('./indexer/schema');
const { fetchGameInfo } = require('./indexer/gameInfo');
const { processBatch } = require('./indexer/processors/batch');
const { calculateAnalytics } = require('./indexer/processors/analytics');
const { calculatePeriodRankings } = require('./indexer/processors/rankings');
const { calculateHomePageRankings } = require('./indexer/processors/homePageRankings');

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

async function indexGames() {
  console.log('🚀 Starting indexing process...');
  const startTime = performance.now();
  
  let db;
  try {
    db = await initializeDatabase();
    
    // Get list of files and game info in parallel
    const [files, gameInfo] = await Promise.all([
      fs.readdir(DATA_DIR),
      fetchGameInfo()
    ]);

    const jsonFiles = files.filter(file => file.endsWith('_downloads.json'));
    console.log(`📁 Found ${jsonFiles.length} JSON files to process`);

    // Process files in batches
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZES.FILES) {
      await processBatch(db, jsonFiles, gameInfo, i, DATA_DIR, BATCH_SIZES);
    }

    // Calculate analytics first
    await calculateAnalytics(db);

    // Calculate rankings for each content type
    console.log('🏆 Calculating rankings...');
    const rankingsStartTime = performance.now();

    // Calculate rankings for each period and content type
    for (const period of PERIODS) {
      for (const contentType of CONTENT_TYPES) {
        await calculatePeriodRankings(db, period, contentType);
      }
    }
    
    const rankingsDuration = ((performance.now() - rankingsStartTime) / 1000).toFixed(2);
    console.log(`\n✨ All rankings calculated in ${rankingsDuration}s`);
    
    // Calculate home page rankings
    console.log('🏠 Calculating home page rankings...');
    for (const period of PERIODS) {
      await calculateHomePageRankings(db, period);
    }

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