import React from 'react';
import { Plus, Settings, Video } from 'lucide-react';
import type { ViewMode, NavTarget } from '../../types/navigation';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: NavTarget) => void;
  isBackendHealthy: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, isBackendHealthy }) => {
  return (
    <header className="border-b border-zinc-800/80 bg-[#0E0E10]/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FFD60A] text-black font-black font-heading text-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              N
            </div>
            <span className="font-heading text-2xl tracking-tighter text-white group-hover:text-[#FFD60A] transition-colors">
              NERRICO
            </span>
          </button>

          {/* Health Dot Badge */}
          <button
            onClick={() => onNavigate('settings')}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-700 transition-colors"
            title={isBackendHealthy ? 'Backend is Online' : 'Backend is Offline (Click for Settings)'}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isBackendHealthy === true
                    ? 'bg-emerald-400'
                    : isBackendHealthy === false
                    ? 'bg-red-400'
                    : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isBackendHealthy === true
                    ? 'bg-emerald-500'
                    : isBackendHealthy === false
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="capitalize font-mono">
              {isBackendHealthy === true ? 'Online' : isBackendHealthy === false ? 'Offline' : 'Checking'}
            </span>
          </button>
        </div>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'dashboard'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Video className="w-4 h-4 text-[#FFD60A]" />
            <span>Projects</span>
          </button>

          <button
            onClick={() => onNavigate('new-video')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-lg ${
              currentView === 'new-video'
                ? 'bg-[#FFD60A] text-black ring-2 ring-[#FFD60A]/50'
                : 'bg-[#FFD60A] text-black hover:bg-[#ffe033] hover:shadow-[#FFD60A]/20'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">New Video</span>
            <span className="sm:hidden">New</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'settings'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};
