import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Layout/Navbar';
import { OfflineBanner } from './components/Layout/OfflineBanner';
import { DashboardPage } from './pages/DashboardPage';
import { NewVideoPage } from './pages/NewVideoPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { api, setGlobalErrorHandler } from './services/api';
import { HEALTH_POLL_INTERVAL_MS } from './config/constants';
import type { ViewMode } from './types/navigation';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const { showError } = useToast();

  // Register API error handler with Toast
  useEffect(() => {
    setGlobalErrorHandler((msg) => {
      showError(msg);
    });
  }, [showError]);

  // Health check function
  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      await api.checkHealth();
      setIsBackendHealthy(true);
    } catch {
      setIsBackendHealthy(false);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  // Poll health status every 10 seconds
  useEffect(() => {
    checkHealth();
    const timer = setInterval(() => {
      checkHealth();
    }, HEALTH_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkHealth]);

  const handleNavigate = (view: ViewMode, projectId?: string) => {
    if (projectId) {
      setSelectedProjectId(projectId);
      setCurrentView('project-detail');
    } else {
      if (view !== 'project-detail') {
        setSelectedProjectId(null);
      }
      setCurrentView(view);
    }
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex flex-col font-sans selection:bg-[#FFD60A] selection:text-black">
      {/* Persistent Offline Banner if backend check fails */}
      <OfflineBanner
        isOffline={isBackendHealthy === false}
        onRetry={checkHealth}
        isChecking={isCheckingHealth}
      />

      {/* Header Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => handleNavigate(view)}
        isBackendHealthy={isBackendHealthy}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <DashboardPage
            onSelectProject={(id) => handleNavigate('project-detail', id)}
            onNewVideo={() => handleNavigate('new-video')}
          />
        )}

        {currentView === 'new-video' && (
          <NewVideoPage
            onBack={() => handleNavigate('dashboard')}
            onProjectCreated={(id) => handleNavigate('project-detail', id)}
          />
        )}

        {currentView === 'project-detail' && selectedProjectId && (
          <ProjectDetailPage
            projectId={selectedProjectId}
            onBack={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'settings' && (
          <SettingsPage
            onHealthUpdate={(healthy) => setIsBackendHealthy(healthy)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-600 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NERRICO &copy; 2026 — Automated Shorts Generator</span>
          <span>Vox-Style Documentary Control Panel</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};
export default App;
