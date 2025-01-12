export function LoadingSpinner({ 
  className = '', 
  size = 'default',
  message = 'Loading statistics...'
}: { 
  className?: string; 
  size?: 'small' | 'default' | 'large';
  message?: string;
}) {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[200px] p-6 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full absolute
          border-4 border-solid border-slate-200 dark:border-slate-800`} />
        <div className={`${sizeClasses[size]} rounded-full animate-spin absolute
          border-4 border-solid border-indigo-500 border-t-transparent shadow-lg`} />
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}