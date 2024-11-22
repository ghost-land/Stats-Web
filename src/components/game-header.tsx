'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Download, HardDrive, Tag, Clock } from 'lucide-react';
import { IMAGE_SIZES, ASPECT_RATIOS } from '@/lib/constants';
import { useState, useEffect } from 'react';
import type { Game } from '@/lib/types';
import { getBaseGameTid, getGameType, gameTypeConfig, formatFileSize } from '@/lib/utils';

export function GameHeader({ game }: { game: Game }) {
  const [mounted, setMounted] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [iconError, setIconError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !game) {
    return null;
  }

  const gameName = game.info?.name || game.tid;
  const releaseDate = game.info?.releaseDate ? new Date(game.info.releaseDate).toLocaleDateString() : null;
  const size = game.info?.size ? formatFileSize(game.info.size) : null;
  const version = game.info?.version || null;
  const totalDownloads = game.stats?.total_downloads || 0;
  
  // Get image TID and game type
  const imageTid = getBaseGameTid(game.tid);
  const gameType = getGameType(game.tid);
  const typeConfig = gameTypeConfig[gameType];

  // Get base game TID for updates
  const baseTid = game.tid.endsWith('800') ? game.tid.slice(0, -3) + '000' : null;

  return (
    <div className="bg-gradient-to-br from-card to-card/95 rounded-lg shadow-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
      <div className="relative" style={{ aspectRatio: ASPECT_RATIOS.BANNER }}>
        <div className="relative w-full h-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          {!bannerError ? (
            <Image
              src={`https://api.nlib.cc/nx/${imageTid}/banner/${IMAGE_SIZES.BANNER.DETAIL.width}/${IMAGE_SIZES.BANNER.DETAIL.height}`}
              alt={gameName}
              fill
              className="object-cover"
              priority
              sizes="100vw"
              onError={() => setBannerError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-600">No banner available</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
      </div>
      
      <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="flex items-start space-x-6">
          {/* Game Icon */}
          <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 ring-1 ring-black/5 dark:ring-white/5">
            {!iconError ? (
              <Image
                src={`https://api.nlib.cc/nx/${imageTid}/icon/${IMAGE_SIZES.ICON.DETAIL.width}/${IMAGE_SIZES.ICON.DETAIL.height}`}
                alt={gameName}
                width={IMAGE_SIZES.ICON.DETAIL.width}
                height={IMAGE_SIZES.ICON.DETAIL.height}
                className="object-cover"
                onError={() => setIconError(true)}
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-400 dark:text-gray-600">No icon</span>
              </div>
            )}
          </div>

          {/* Game Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold truncate">
                {gameName}
              </h1>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${typeConfig.colors.light} ${typeConfig.colors.dark}`}>
                {typeConfig.label}
              </div>
              {version && (
                <div className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  v{version}
                </div>
              )}
            </div>

            {/* TID Info */}
            <div className="mt-2 flex items-center text-muted-foreground">
              <Tag className="w-4 h-4 mr-2" />
              <span className="truncate">{game.tid}</span>
            </div>

            {/* Stats Grid */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Download className="w-4 h-4" />
                <span>{totalDownloads.toLocaleString()} downloads</span>
              </div>

              {size && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <HardDrive className="w-4 h-4" />
                  <span>{size}</span>
                </div>
              )}

              {releaseDate && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{releaseDate}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Base Game Link (for updates) */}
            {baseTid && (
              <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Link 
                  href={`/${baseTid}`}
                  className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  <span>Base Game: {baseTid}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}