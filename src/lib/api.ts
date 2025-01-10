import { cache } from 'react';
import type { Game } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Get global statistics
export const getGlobalStats = cache(async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
    const data = await response.json();
    return {
      last_72h: Number(data.last_72h || 0),
      last_7d: Number(data.last_7d || 0),
      last_30d: Number(data.last_30d || 0),
      all_time: Number(data.all_time || 0)
    };
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return {
      last_72h: 0,
      last_7d: 0,
      last_30d: 0,
      all_time: 0
    };
  }
});

// Get top games for a specific period
export const getTopGames = cache(async (period: '72h' | '7d' | '30d' | 'all', showAll = false) => {
  try {
    const response = await fetch(`${API_BASE}/api/top/${period}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const games = await response.json();
    return Array.isArray(games) ? games : [];
  } catch (error) {
    console.error('Error fetching top games:', error);
    return [];
  }
});

// Get game rankings for all periods
export const getGameRankings = cache(async (tid: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/rankings/${tid}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching game rankings:', error);
    return null;
  }
});

// Get rankings for multiple games at once
export const getGamesRankings = cache(async (tids: string[], period: '72h' | '7d' | '30d' | 'all') => {
  try {
    const response = await fetch(`${API_BASE}/api/rankings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tids, period }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return new Map(Object.entries(data));
  } catch (error) {
    console.error('Error fetching games rankings:', error);
    return new Map();
  }
});

// Get details for a specific game
export const getGameDetails = cache(async (tid: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/games/${tid}`, {
      cache: 'no-store'
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching game details:', error);
    return null;
  }
});