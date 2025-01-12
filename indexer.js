const fs = require('fs').promises;
const path = require('path');
const { rename } = require('fs').promises;

// Import modules
const { BATCH_SIZES, PERIODS, CONTENT_TYPES } = require('./indexer/constants');
const { getDatabase } = require('./indexer/database');
const { initializeDatabase } = require('./indexer/schema');
const { fetchGameInfo } = require('./indexer/gameInfo');
const { processBatch } = require('./indexer/processors/batch');
const { calculateAnalytics } = require('./indexer/processors/analytics');
const { calculatePeriodRankings } = require('./indexer/processors/rankings');
const { calculateHomePageRankings } = require('./indexer/processors/homePageRankings');

// Configuration
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/mnt/data' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(process.cwd(), 'public', 'games.db');
const TEMP_DB_PATH = path.join(process.cwd(), 'public', 'games.db_temp');

async function indexGames() {
  console.log('🚀 Starting indexing process...');
  const startTime = performance.now();
  
  let db;
  try {
    // Initialize temporary database
    db = await initializeDatabase(TEMP_DB_PATH);
    
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

    // Close database connection
    if (db) {
      db.close();
      db = null;
    }

    // Replace old database with new one
    try {
      // Wait a bit to ensure connections are closed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Remove old database if it exists
      await fs.unlink(DB_PATH).catch(() => {});
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Rename temp database to final name
      await rename(TEMP_DB_PATH, DB_PATH);
      console.log('✅ Database updated successfully');
    } catch (error) {
      console.error('❌ Error replacing database:', error);
      // Try to clean up temp database
      await fs.unlink(TEMP_DB_PATH).catch(() => {});
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during indexing:', error);
    // Clean up temp database on error
    try {
      await fs.unlink(TEMP_DB_PATH).catch(() => {});
    } catch {}
    process.exit(1);
  }
}

// Start indexing
indexGames();