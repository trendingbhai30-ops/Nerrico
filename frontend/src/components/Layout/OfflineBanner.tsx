import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  onRetry: () => void;
  isChecking?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, onRetry, isChecking }) => {
  if (!isOffline) return null;

  return (
    <div className="bg-red-950/90 border-b border-red-500/30 text-red-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs md:text-sm font-medium backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-2.5 mx-auto md:mx-0">
        <WifiOff className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
        <span>Backend offline — start the Nerrico backend first.</span>
      </div>
      <button
        onClick={onRetry}
        disabled={isChecking}
        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/60 hover:bg-red-800/80 border border-red-700/50 rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        <span>Recheck</span>
      </button>
    </div>
  );
};
