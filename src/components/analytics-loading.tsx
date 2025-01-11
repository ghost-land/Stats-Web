export function AnalyticsLoading() {
  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center">
      <div className="w-24 h-24 mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg animate-[pulse_2s_ease-in-out_infinite]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full p-5 text-white"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 animate-[pulse_2s_ease-in-out_infinite]">
          Loading Analytics
        </h2>

        <div className="text-muted-foreground">
          Loading statistics...
        </div>

        <div className="mt-8 w-64 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full animate-loading-bar" />
        </div>
      </div>
    </div>
  );
}