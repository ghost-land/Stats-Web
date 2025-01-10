import { cache } from 'react';
import type { Game } from './types';

// Global cache with better typing
let gamesCache: Game[] = [];
let lastIndexTime = 0;
const REINDEX_INTERVAL = 3600000; // 1 hour in milliseconds

// Function to get games with caching
export const getGamesCache = cache(async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/games`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (response.status === 404) {
      console.log('Database not found');
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error reading database:', error);
    return [];
  }
});