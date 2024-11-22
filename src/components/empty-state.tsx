import { FileQuestion } from 'lucide-react';
import { Card } from './ui/card';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({ 
  title = 'No Data Available',
  message = 'No game statistics are currently available. Please check back later.'
}: EmptyStateProps) {
  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-6">
        <FileQuestion className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{message}</p>
    </Card>
  );
}