import { config } from './config';
import type { GameInfo } from './types';

// Cache for game info to avoid repeated fetches
let gameInfoCache: Record<string, GameInfo> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface WorkingJsonGame {
  'Game Name': string;
  'Version': string;
  'Size': number;
}

export async function fetchGameInfo(): Promise<Record<string, GameInfo>> {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (Object.keys(gameInfoCache).length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return gameInfoCache;
  }

  try {
    // Fetch working.json for game names and sizes
    const [workingResponse, titlesResponse] = await Promise.all([
      fetch(config.gameInfo.workingJsonUrl),
      fetch(config.gameInfo.titlesDbUrl)
    ]);

    const workingData: Record<string, WorkingJsonGame> = await workingResponse.json();
    const titlesText = await titlesResponse.text();

    // Parse titles_db.txt
    const titleInfo: Record<string, { name: string; releaseDate: string; size: number }> = {};
    
    titlesText.split('\n').forEach(line => {
      const [tid, releaseDate, name, size] = line.split('|');
      if (tid && releaseDate && name) {
        titleInfo[tid] = { name, releaseDate, size: parseInt(size, 10) };
      }
    });

    // Combine both sources
    const gameInfo: Record<string, GameInfo> = {};
    
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

    // Update cache
    gameInfoCache = gameInfo;
    lastFetchTime = now;

    return gameInfo;
  } catch (error) {
    console.error('Error fetching game info:', error);
    return gameInfoCache; // Return cached data on error
  }
}