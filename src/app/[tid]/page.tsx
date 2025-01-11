import { Suspense } from 'react';
import { getGameDetails } from '@/lib/api';
import { GameHeader } from '@/components/game-header';
import { GameStats } from '@/components/game-stats';
import { RelatedContent } from '@/components/related-content/index';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { getBaseGameTid } from '@/lib/utils';
import { getDatabase } from '@/lib/db';
import { IMAGE_SIZES } from '@/lib/constants';
import type { Game } from '@/lib/types';

interface DlcRow {
  tid: string;
}

// Force dynamic rendering and no caching for game details
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Props = {
  params: { tid: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    const game = await getGameDetails(params.tid);
  
    if (!game) {
      return {
        title: 'Game Not Found - Game Stats',
      };
    }

    const gameName = game.info?.name || game.tid;
    const imageTid = getBaseGameTid(game.tid);
    const iconUrl = `https://api.nlib.cc/nx/${imageTid}/icon/${IMAGE_SIZES.ICON.DETAIL.width}/${IMAGE_SIZES.ICON.DETAIL.height}`;

    return {
      title: `${gameName} - Game Stats`,
      description: `View download statistics and information for ${gameName}. Version: ${game.info?.version || 'N/A'}, Total downloads: ${game.stats.total_downloads.toLocaleString()}`,
      openGraph: {
        title: `${gameName} - Game Stats`,
        description: `View download statistics and information for ${gameName}. Version: ${game.info?.version || 'N/A'}, Total downloads: ${game.stats.total_downloads.toLocaleString()}`,
        images: [
          {
            url: iconUrl,
            width: IMAGE_SIZES.ICON.DETAIL.width,
            height: IMAGE_SIZES.ICON.DETAIL.height,
            alt: gameName,
          }
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `${gameName} - Game Stats`,
        description: `View download statistics and information for ${gameName}. Version: ${game.info?.version || 'N/A'}, Total downloads: ${game.stats.total_downloads.toLocaleString()}`,
        images: [iconUrl],
      },
      icons: {
        icon: iconUrl,
        apple: iconUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error - Game Stats',
      description: 'An error occurred while loading game information.'
    };
  }
}

async function getRelatedContent(game: Game) {
  const db = await getDatabase();
  if (!db) return { update: null, dlcs: [] };

  // Pour les DLC et mises à jour, récupérer le jeu de base
  if (!game.is_base && game.base_tid) {
    const baseGame = await getGameDetails(game.base_tid);
    if (baseGame) {
      // Récupérer la mise à jour
      const updateTid = baseGame.tid.slice(0, -3) + '800';
      const update = await getGameDetails(updateTid);

      // Récupérer les DLC
      const dlcsQuery = `
        SELECT tid FROM games 
        WHERE tid LIKE ? || '%'
        AND substr(tid, -3) NOT IN ('000', '800')
        ORDER BY total_downloads DESC
      `;
      const dlcTids = (db.prepare(dlcsQuery).all(baseGame.tid.slice(0, 12)) as DlcRow[]).map(row => row.tid);
      const dlcs = (await Promise.all(dlcTids.map(tid => getGameDetails(tid))))
        .filter((dlc): dlc is Game => dlc !== null);

      return {
        baseGame,
        update: update || null,
        dlcs
      };
    }
  }

  // Récupérer la mise à jour
  const updateTid = game.tid.slice(0, -3) + '800';
  const update = await getGameDetails(updateTid);

  // Récupérer les DLC
  const dlcsQuery = `
    SELECT tid FROM games 
    WHERE tid LIKE ? || '%'
    AND substr(tid, -3) NOT IN ('000', '800')
    ORDER BY total_downloads DESC
  `;
  const dlcTids = (db.prepare(dlcsQuery).all(game.tid.slice(0, 12)) as DlcRow[]).map(row => row.tid);
  const dlcs = (await Promise.all(dlcTids.map(tid => getGameDetails(tid))))
    .filter((dlc): dlc is Game => dlc !== null);

  return {
    update: update || null,
    dlcs
  };
}

export default async function GamePage({ params }: Props) {
  const game = await getGameDetails(params.tid);

  if (!game) {
    notFound();
  }

  const { baseGame, update, dlcs } = await getRelatedContent(game);

  return (
    <div className="space-y-8">
      <GameHeader game={game} />
      <Suspense fallback={<LoadingSpinner />}>
        <GameStats game={game} />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <RelatedContent 
          baseGame={baseGame} 
          update={update} 
          dlcs={dlcs}
          currentTid={params.tid}
        />
      </Suspense>
    </div>
  );
}