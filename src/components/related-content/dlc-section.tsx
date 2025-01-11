'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Download, HardDrive, Calendar, X, Package } from 'lucide-react';
import type { Game } from '@/lib/types';
import { getBaseGameTid, formatFileSize, formatDate } from '@/lib/utils';

interface DlcStatsProps {
  dlcs: Game[];
}

function DlcStats({ dlcs }: DlcStatsProps) {
  const totalDownloads = dlcs.reduce((sum, dlc) => sum + (dlc.stats.total_downloads || 0), 0);
  const totalSize = dlcs.reduce((sum, dlc) => sum + (dlc.info?.size || 0), 0);
  const latestDlc = dlcs.reduce((latest, dlc) => {
    if (!latest.info?.releaseDate) return dlc;
    if (!dlc.info?.releaseDate) return latest;
    return new Date(dlc.info.releaseDate) > new Date(latest.info.releaseDate) ? dlc : latest;
  }, dlcs[0]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Downloads</div>
        <div className="text-lg font-semibold">{totalDownloads.toLocaleString()}</div>
      </div>
      <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Size</div>
        <div className="text-lg font-semibold">{formatFileSize(totalSize)}</div>
      </div>
      {latestDlc.info?.releaseDate && (
        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Latest Release</div>
          <div className="text-lg font-semibold">{formatDate(latestDlc.info.releaseDate)}</div>
        </div>
      )}
    </div>
  );
}

interface DlcModalProps {
  dlcs: Game[];
  onClose: () => void;
}

function DlcModal({ dlcs, onClose }: DlcModalProps) {
  const baseTid = getBaseGameTid(dlcs[0].tid);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 touch-none">
      <div ref={modalRef} className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-purple-600/[0.03]" />
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 ring-1 ring-black/5 dark:ring-white/5 shadow-lg">
              <Image
                src={`https://api.nlib.cc/nx/${baseTid}/icon/256/256`}
                alt="Game Icon"
                width={64}
                height={64}
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">All DLC Items</h3>
              <p className="text-sm text-slate-500">{dlcs.length} items available</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -m-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <DlcStats dlcs={dlcs} />
          <div className="mt-6 space-y-2">
            {dlcs.map((dlc) => (
              <Link key={dlc.tid} href={`/${dlc.tid}`} onClick={onClose}>
                <div className="p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate flex-1">{dlc.info?.name || dlc.tid}</h4>
                      <div className="flex items-center text-sm text-slate-500">
                        <Download className="w-4 h-4 mr-1" />
                        {dlc.stats.total_downloads.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        {dlc.info?.size ? formatFileSize(dlc.info.size) : 'Unknown size'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {dlc.info?.releaseDate ? formatDate(dlc.info.releaseDate) : 'Unknown date'}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DlcSectionProps {
  dlcs: Game[];
}

export function DlcSection({ dlcs }: DlcSectionProps) {
  const [showAllDlc, setShowAllDlc] = useState(false);

  if (dlcs.length === 0) return null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Downloadable Content</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 rounded-full">
              {dlcs.length} items
            </span>
          </div>
        </div>

        <DlcStats dlcs={dlcs} />
        
        <div className="space-y-2">
          {dlcs.slice(0, 3).map((dlc) => (
            <Link key={dlc.tid} href={`/${dlc.tid}`}>
              <div className="p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">
                    {dlc.info?.name || dlc.tid}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <div>
                      {dlc.stats.total_downloads.toLocaleString()} downloads
                    </div>
                    {dlc.info?.size && (
                      <div>
                        {formatFileSize(dlc.info.size)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {dlcs.length > 3 && (
            <button
              onClick={() => setShowAllDlc(true)}
              className="w-full p-3 text-center text-sm font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              View all {dlcs.length} DLC items
            </button>
          )}
        </div>
      </div>

      {showAllDlc && (
        <DlcModal dlcs={dlcs} onClose={() => setShowAllDlc(false)} />
      )}
    </>
  );
}