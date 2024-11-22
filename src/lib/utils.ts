export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short'
  });
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

export function getBaseGameTid(tid: string): string {
  if (tid.endsWith('000')) return tid; // Already a base game
  if (tid.endsWith('800')) return tid.slice(0, -3) + '000'; // Update
  
  // For DLC, handle the special case
  const baseTid = tid.slice(0, 12); // First 12 chars
  const char13 = tid.charAt(12);
  const prevChar = String.fromCharCode(char13.charCodeAt(0) - 1);
  return baseTid + prevChar + '000';
}

export function getGameType(tid: string): 'base' | 'update' | 'dlc' {
  if (tid.endsWith('000')) return 'base';
  if (tid.endsWith('800')) return 'update';
  return 'dlc';
}

export const gameTypeConfig = {
  base: {
    label: 'Base Game',
    colors: {
      light: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
      dark: 'dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20'
    }
  },
  update: {
    label: 'Update',
    colors: {
      light: 'bg-blue-100 text-blue-700 ring-blue-600/20',
      dark: 'dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20'
    }
  },
  dlc: {
    label: 'DLC',
    colors: {
      light: 'bg-purple-100 text-purple-700 ring-purple-600/20',
      dark: 'dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20'
    }
  }
} as const;