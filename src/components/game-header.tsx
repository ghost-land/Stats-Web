'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Download, HardDrive, Tag, Clock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { IMAGE_SIZES, ASPECT_RATIOS } from '@/lib/constants';
import { useState, useEffect, useRef } from 'react';
import type { Game } from '@/lib/types';
import { getBaseGameTid, getGameType, gameTypeConfig, formatFileSize } from '@/lib/utils';

export function GameHeader({ game }: { game: Game }) {
  const [mounted, setMounted] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [showTotalDataInfo, setShowTotalDataInfo] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setShowTotalDataInfo(false);
      }
    };

    if (showTotalDataInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTotalDataInfo]);

  useEffect(() => {
    if (showTotalDataInfo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showTotalDataInfo]);

  if (!mounted || !game) {
    return null;
  }

  const gameName = game.info?.name || game.tid;
  const releaseDate = game.info?.releaseDate ? new Date(game.info.releaseDate).toLocaleDateString() : null;
  const size = game.info?.size ? formatFileSize(game.info.size) : null;
  const version = game.info?.version || null;
  const totalDownloads = game.stats?.total_downloads || 0;
  const totalDataSize = game.info?.size ? formatFileSize(game.info.size * totalDownloads) : null;
  
  // Get image TID and game type
  const imageTid = getBaseGameTid(game.tid);
  const gameType = getGameType(game.tid);
  const typeConfig = gameTypeConfig[gameType];

  // Get base game TID for updates
  const baseTid = game.tid.endsWith('800') ? game.tid.slice(0, -3) + '000' : null;

  return (
    <div className="bg-gradient-to-br from-card to-card/95 rounded-lg shadow-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
      <div className="relative" style={{ aspectRatio: ASPECT_RATIOS.BANNER }}>
        <div className="relative w-full h-full bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900">
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
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${typeConfig.colors.light} ${typeConfig.colors.dark}`}>
            {typeConfig.label}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Game Icon */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 ring-1 ring-black/5 dark:ring-white/5 shadow-lg">
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
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {gameName}
                </h1>
              </div>

              <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">{game.tid}</span>
                {version && (
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    • v{version}
                  </span>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
              <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Downloads</div>
                <div className="text-lg font-semibold">{totalDownloads.toLocaleString()}</div>
              </div>
              
              {size && (
                <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Size</div>
                  <div className="text-lg font-semibold">{size}</div>
                </div>
              )}

              {totalDataSize && (
                <div className="group/tooltip relative bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3 md:cursor-help">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                    Total Data
                    <button 
                      onClick={() => setShowTotalDataInfo(true)}
                      className="md:hidden p-1.5 -m-1 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors active:scale-95"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none max-w-[200px] text-center z-50">
                      <p className="font-medium mb-1">Total Data Downloaded</p>
                      <p className="text-slate-300">Combined size of all downloads for this game ({totalDownloads.toLocaleString()} × {size})</p>
                    </div>
                  </div>
                  <div className="text-lg font-semibold group-hover/tooltip:text-indigo-500 transition-colors">
                    {totalDataSize}
                  </div>
                </div>
              )}

              {/* Mobile Info Dialog */}
              {showTotalDataInfo && (
                <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end touch-none">
                  <div ref={dialogRef} className="w-full bg-white dark:bg-slate-900 rounded-t-2xl p-6 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Total Data Downloaded</h3>
                      <button 
                        onClick={() => setShowTotalDataInfo(false)}
                        className="p-2 -m-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path 
                            d="M6 18L18 6M6 6l12 12" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-slate-600 dark:text-slate-400">
                        This represents the total amount of data transferred for all downloads of this game.
                      </p>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">Game Size</span>
                          <span className="font-medium">{size}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">Total Downloads</span>
                          <span className="font-medium">{totalDownloads.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total Data</span>
                            <span className="font-bold text-indigo-500">{totalDataSize}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {releaseDate && (
                <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Released</div>
                  <div className="text-lg sm:text-xl font-semibold truncate">{releaseDate}</div>
                </div>
              )}
              
              {baseTid && (
                <Link href={`/${baseTid}`}>
                  <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-3 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors active:scale-[0.98] hover:shadow-md">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Base Game</div>
                    <div className="text-lg sm:text-xl font-semibold truncate hover:text-indigo-500 transition-colors">{baseTid}</div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}