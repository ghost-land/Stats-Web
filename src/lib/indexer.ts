import { promises as fs } from 'fs';
import path from 'path';
import { cache } from 'react';
import type { Game, GameStats, GameInfo } from './types';
import { fetchGameInfo } from './game-info';
import { config } from './config';

// Get data directory from environment variable or use default
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Global cache for indexed games with better typing
let gamesCache: Game[] = [];
let lastIndexTime = 0;
const REINDEX_INTERVAL = config.indexer.reindexInterval;
const BATCH_SIZE = 50; // Process files in batches of 50

// Function to read and parse a JSON file with proper cleanup
async function readJsonFile(filePath: string): Promise<GameStats> {
  let fileHandle = null;
  try {
    fileHandle = await fs.open(filePath, 'r');
    const content = await fileHandle.readFile('utf8');
    return JSON.parse(content) as GameStats;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(console.error);
    }
  }
}

// Process a batch of files
async function processBatch(
  files: string[], 
  gameInfo: Record<string, GameInfo>,
  startIdx: number
): Promise<Game[]> {
  const endIdx = Math.min(startIdx + BATCH_SIZE, files.length);
  const batchFiles = files.slice(startIdx, endIdx);
  const games: Game[] = [];

  await Promise.all(
    batchFiles.map(async (file) => {
      if (!file.endsWith('_downloads.json')) return;

      try {
        const filePath = path.join(DATA_DIR, file);
        const stats = await readJsonFile(filePath);
        const tid = file.replace('_downloads.json', '');
        
        const game: Game = {
          tid,
          is_base: tid.endsWith('000'),
          is_update: tid.endsWith('800'),
          is_dlc: !tid.endsWith('000') && !tid.endsWith('800'),
          base_tid: tid.endsWith('000') ? null : `${tid.slice(0, 12)}000`,
          stats,
          info: gameInfo[tid],
        };

        games.push(game);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    })
  );

  return games;
}

// Main indexing function
async function indexGames(): Promise<Game[]> {
  console.log('Starting game indexing...');
  console.log(`Using data directory: ${DATA_DIR}`);
  const startTime = performance.now();

  try {
    // Get list of files and game info in parallel
    const [files, gameInfo] = await Promise.all([
      fs.readdir(DATA_DIR),
      fetchGameInfo()
    ]);

    const jsonFiles = files.filter(file => file.endsWith('_downloads.json'));
    const games: Game[] = [];

    // Process files in batches
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
      const batchGames = await processBatch(jsonFiles, gameInfo, i);
      games.push(...batchGames);

      // Log progress
      const progress = Math.min(100, (i + BATCH_SIZE) / jsonFiles.length * 100);
      console.log(`Indexing progress: ${progress.toFixed(1)}%`);
    }

    // Sort games by total downloads
    const sortedGames = games.sort((a, b) => b.stats.total_downloads - a.stats.total_downloads);

    // Log statistics
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const baseGames = sortedGames.filter(g => g.is_base);
    const updateGames = sortedGames.filter(g => g.is_update);
    const dlcGames = sortedGames.filter(g => g.is_dlc);
    const totalDownloads = sortedGames.reduce((sum, game) => sum + game.stats.total_downloads, 0);

    console.log(`
Indexing completed in ${duration} seconds
Total games indexed: ${sortedGames.length}
Base games: ${baseGames.length}
Update games: ${updateGames.length}
DLC games: ${dlcGames.length}
Total downloads: ${totalDownloads.toLocaleString()}
    `);

    return sortedGames;
  } catch (error) {
    console.error('Error during game indexing:', error);
    return [];
  }
}

// Function to get games with caching
export const getGamesCache = cache(async () => {
  const now = Date.now();

  // Check if we need to reindex
  if (gamesCache.length === 0 || now - lastIndexTime >= REINDEX_INTERVAL) {
    gamesCache = await indexGames();
    lastIndexTime = now;
  }

  return gamesCache;
});

// Export types
export type { Game, GameStats, GameInfo };