'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Download, HardDrive } from 'lucide-react';
import type { Game } from '@/lib/types';
import { getBaseGameTid, formatFileSize } from '@/lib/utils';

interface BaseGameSectionProps {
  game: Game;
}

export function BaseGameSection({ game }: BaseGameSectionProps) {
  if (!game) return null;

  const downloads = game.stats.total_downloads;

  return (
    <Link href={`/${game.tid}`}>
      <div className="flex items-start gap-6 p-4 -m-4 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-transform group-hover:scale-105">
          <Image
            src={`https://api.nlib.cc/nx/${getBaseGameTid(game.tid)}/icon/256/256`}
            alt={game.info?.name || game.tid}
            width={96}
            height={96}
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md">
              Base Game
            </span>
            {game.info?.version && (
              <span className="text-sm text-slate-500">
                Version {game.info.version}
              </span>
            )}
          </div>

          <h3 className="mt-2 text-lg font-semibold group-hover:text-indigo-500 transition-colors">
            {game.info?.name || game.tid}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Downloads</div>
              <div className="text-base font-semibold">{downloads.toLocaleString()}</div>
            </div>
            {game.info?.size && (
              <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Size</div>
                <div className="text-base font-semibold">{formatFileSize(game.info.size)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}