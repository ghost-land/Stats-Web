import { getDatabase } from './db';
import pako from 'pako';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'public', 'analytics-cache.gz');
let memoryCache: Record<string, any> = {};
let lastDbCheck = 0;

// Check if cache needs to be refreshed
async function shouldRefreshCache(): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return true;

  try {
    const now = Date.now();
    if (now - lastDbCheck > 60000) { // Check every minute
      const result = db.prepare(`
        SELECT MAX(last_updated) as last_update 
        FROM analytics_period_stats
      `).get() as { last_update: string | null };

      if (!result?.last_update) return true;

      const lastUpdate = new Date(result.last_update).getTime();
      lastDbCheck = now;
      return lastUpdate > lastDbCheck;
    }
    return false;
  } catch (error) {
    console.error('Error checking cache freshness:', error);
    return true; // Refresh on error
  }
}

// Generate cache key from params
function getCacheKey(params: URLSearchParams): string {
  const period = params.get('period') || 'all';
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const year = params.get('year');
  const month = params.get('month');
  return `${period}-${startDate}-${endDate}-${year}-${month}`;
}

// Save cache to disk
function persistCache() {
  try {
    const compressed = pako.deflate(JSON.stringify(memoryCache), { level: 9 });
    fs.writeFileSync(CACHE_FILE, Buffer.from(compressed));
  } catch (error) {
    console.error('Error persisting analytics cache:', error);
  }
}

// Load cache from disk
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const compressed = fs.readFileSync(CACHE_FILE);
      const decompressed = pako.inflate(compressed, { to: 'string' });
      memoryCache = JSON.parse(decompressed);
    }
  } catch (error) {
    console.error('Error loading analytics cache:', error);
    memoryCache = {};
  }
}

// Initialize cache
loadCache();

export async function getAnalyticsCache(params: URLSearchParams) {
  const key = getCacheKey(params);
  
  // Check if cache needs refresh
  if (await shouldRefreshCache()) {
    console.log('Analytics cache needs refresh, clearing...');
    memoryCache = {}; // Clear cache
    persistCache();
    return null;
  }

  // Return cached data if available
  if (memoryCache[key]) {
    console.log('Returning cached analytics data for key:', key);
    return memoryCache[key];
  }

  return null;
}

export function setAnalyticsCache(params: URLSearchParams, data: any) {
  const key = getCacheKey(params);
  console.log('Caching analytics data for key:', key);
  memoryCache[key] = data;
  persistCache();
}