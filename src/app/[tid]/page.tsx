import { Suspense } from 'react';
import { getGameDetails } from '@/lib/api';
import { GameHeader } from '@/components/game-header';
import { GameStats } from '@/components/game-stats';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { getBaseGameTid } from '@/lib/utils';
import { IMAGE_SIZES } from '@/lib/constants';

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

export default async function GamePage({ params }: Props) {
  const game = await getGameDetails(params.tid);

  if (!game) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <GameHeader game={game} />
      <Suspense fallback={<LoadingSpinner />}>
        <GameStats game={game} />
      </Suspense>
    </div>
  );
}