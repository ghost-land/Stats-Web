'use client';

import { Card } from '@/components/ui/card';
import type { Game } from '@/lib/types';
import { BaseGameSection } from './base-game';
import { UpdateSection } from './update-section';
import { DlcSection } from './dlc-section';

interface RelatedContentProps {
  baseGame?: Game | null;
  update?: Game | null;
  dlcs?: Game[];
  currentTid: string;
}

export function RelatedContent({ baseGame, update, dlcs = [], currentTid }: RelatedContentProps) {
  if (!baseGame && !update && dlcs.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
        
        <div className="relative p-4 bg-gradient-to-r from-indigo-500 to-indigo-600">
          <h2 className="text-lg font-semibold text-white">Related Content</h2>
        </div>
        
        <div className="relative p-6 space-y-8">
          {baseGame && <BaseGameSection game={baseGame} />}
          {update && <UpdateSection update={update} currentTid={currentTid} />}
          {dlcs.length > 0 && <DlcSection dlcs={dlcs} />}
        </div>
      </Card>
    </div>
  );
}