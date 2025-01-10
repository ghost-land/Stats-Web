'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Download, Star, Calendar, HardDrive, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import type { Game } from '@/lib/types';
import { formatDate, formatFileSize, getBaseGameTid, getGameType, gameTypeConfig, cn } from '@/lib/utils';

interface GameCardProps {
  game: Game;
  rank: number;
  period?: '72h' | '7d' | '30d' | 'all';
  rankChange?: number;
}

const RankTrendBadge = ({ change, period }: { change?: number, period?: string }) => {
  if (change === undefined || period === 'all') return null;

  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : ChevronRight;
  const baseClasses = 'inline-flex items-center justify-center w-6 h-6 rounded-full absolute top-2 right-2 z-10';
  const colorClasses = change > 0 
    ? 'bg-emerald-500 text-white'
    : change < 0 
    ? 'bg-rose-500 text-white'
    : 'bg-slate-500 text-white';

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      <Icon className="w-4 h-4" />
    </span>
  );
};

export function GameCard({ game, rank, period = 'all', rankChange }: GameCardProps) {
  const [mounted, setMounted] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [showBaseGame, setShowBaseGame] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pour les mises à jour et DLC, charger les informations du jeu de base
  useEffect(() => {
    if (!game.is_base && game.base_tid) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/games/${game.base_tid}`)
        .then(res => res.json())
        .then(baseGame => setShowBaseGame(true))
        .catch(console.error);
    }
  }, [game]);

  if (!mounted || !game) return null;

  const getPeriodDownloads = () => {
    if (!game.stats?.per_date) return 0;
    const dates = Object.entries(game.stats.per_date).sort((a, b) => a[0].localeCompare(b[0]));
    const days = period === '72h' ? 3 : period === '7d' ? 7 : period === '30d' ? 30 : dates.length;
    return dates.slice(-days).reduce((sum, [, count]) => sum + count, 0);
  };

  const periodDownloads = getPeriodDownloads();
  const gameName = game.info?.name || game.tid;
  const releaseDate = game.info?.releaseDate ? formatDate(game.info.releaseDate) : null;
  const size = game.info?.size ? formatFileSize(game.info.size) : null;
  
  // Get image TID and game type
  const imageTid = getBaseGameTid(game.tid);
  const gameType = getGameType(game.tid);
  const typeConfig = gameTypeConfig[gameType];

  // Ajouter une classe spéciale pour les mises à jour et DLC
  const cardClasses = cn(
    "group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl will-change-transform h-full bg-gradient-to-br from-white to-white/95 dark:from-slate-900 dark:to-slate-900/95",
    {
      'ring-2 ring-indigo-500/20 dark:ring-indigo-400/20': !game.is_base
    }
  );

  return (
    <Link href={`/${game.tid}`}>
      <Card className={cardClasses}>
        {/* Rank Trend Badge */}
        <RankTrendBadge change={rankChange} period={period} />

        {/* Banner Image */}
        <div className="relative aspect-video w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900">
            {!bannerError ? (
              <Image
                src={`https://api.nlib.cc/nx/${imageTid}/banner/1920/1080`}
                alt={gameName}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105 blur-up"
                priority={rank <= 3}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading={rank <= 6 ? 'eager' : 'lazy'}
                quality={rank <= 3 ? 85 : 75}
                onError={() => setBannerError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-slate-400 dark:text-slate-600">No image</span>
              </div>
            )}
          </div>
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

          {/* Rank Badge */}
          <div className="absolute top-4 left-4">
            {rank <= 3 ? (
              <div className="flex items-center space-x-1 bg-amber-500/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-white font-bold shadow-lg">
                <Star className="w-4 h-4" fill="currentColor" />
                <span>#{rank}</span>
              </div>
            ) : (
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-1.5 rounded-full font-bold shadow-lg">
                #{rank}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start space-x-4">
            {/* Game Icon */}
            <div className="relative w-16 sm:w-20 h-16 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 ring-1 ring-black/5 dark:ring-white/5 shadow-md">
              {!iconError ? (
                <Image
                  src={`https://api.nlib.cc/nx/${imageTid}/icon/256/256`}
                  alt={gameName}
                  width={80}
                  height={80}
                  className="object-cover"
                  loading={rank <= 6 ? 'eager' : 'lazy'}
                  quality={rank <= 3 ? 85 : 75}
                  onError={() => setIconError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-slate-400 dark:text-slate-600">No icon</span>
                </div>
              )}
            </div>

            {/* Game Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg truncate text-slate-900 dark:text-slate-100">
                {gameName}
              </h3>
              
              <div className="mt-1 flex items-center space-x-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                  {game.tid}
                </span>
              </div>

              {/* Game Type Badge */}
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${typeConfig.colors.light} ${typeConfig.colors.dark}`}>
                  {typeConfig.label}
                </span>
                {!game.is_base && game.base_tid && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                    Base: {game.base_tid}
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="flex items-center text-slate-600 dark:text-slate-400">
                  <Download className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {periodDownloads.toLocaleString()}
                  </span>
                </div>

                {size && (
                  <div className="flex items-center text-slate-600 dark:text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span className="truncate">{size}</span>
                  </div>
                )}

                {releaseDate && (
                  <div className="flex items-center text-slate-600 dark:text-slate-400 col-span-2 sm:col-span-1">
                    <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span className="truncate">{releaseDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
}