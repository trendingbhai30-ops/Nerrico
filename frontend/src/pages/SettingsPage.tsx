import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, setApiBaseUrl, DEFAULT_API_BASE_URL } from '../config/api';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { HealthResponse } from '../types/api';
import { getErrorMessage } from '../utils/errors';
import { Save, RotateCcw, Activity, Server, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  onHealthUpdate?: (isHealthy: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onHealthUpdate }) => {
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { showSuccess } = useToast();

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setErrorMsg(null);
    try {
      const data = await api.checkHealth();
      setHealthData(data);
      if (onHealthUpdate) onHealthUpdate(true);
    } catch (err) {
      setHealthData(null);
      setErrorMsg(getErrorMessage(err, 'Could not reach backend health endpoint'));
      if (onHealthUpdate) onHealthUpdate(false);
    } finally {
      setIsChecking(false);
    }
  }, [onHealthUpdate]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(urlInput);
    showSuccess('Backend URL updated and saved');
    checkHealth();
  };

  const handleReset = () => {
    setUrlInput(DEFAULT_API_BASE_URL);
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    showSuccess('Reset API URL to default');
    checkHealth();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl sm:text-4xl font-heading text-white tracking-tight">SETTINGS</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure backend API connection and monitor server status.</p>
      </div>

      <div className="space-y-6">
        {/* Backend Status Widget */}
        <div className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[#FFD60A]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base text-white">BACKEND SERVICE STATUS</h3>
                <p className="text-xs text-zinc-400">Pings `GET /api/health` to verify system readiness</p>
              </div>
            </div>

            <button
              type="button"
              onClick={checkHealth}
              disabled={isChecking}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isChecking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Test Connection</span>
            </button>
          </div>

          {/* Status Display Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              healthData
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : errorMsg
                ? 'bg-red-950/40 border-red-500/30 text-red-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-3">
              {healthData ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {healthData ? 'Backend Online' : 'Backend Offline or Unreachable'}
                </div>
                <div className="text-xs font-mono opacity-80 mt-0.5">
                  {healthData ? `Version: ${healthData.version || '1.0'}` : errorMsg || 'No response'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  healthData ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="uppercase">{healthData ? 'OK' : 'ERROR'}</span>
            </div>
          </div>
        </div>

        {/* API Base URL Form */}
        <form onSubmit={handleSave} className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base text-white">API BASE URL</h3>
              <p className="text-xs text-zinc-400">Target host for API calls (persisted in browser localStorage)</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="api-url" className="block text-xs font-mono text-zinc-300 uppercase tracking-wider">
              Server Host Endpoint
            </label>
            <input
              id="api-url"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:4000"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-colors"
            />
            <p className="text-xs text-zinc-500">
              Default: <code className="text-zinc-400">{DEFAULT_API_BASE_URL}</code>. Make sure to include the protocol (http/https).
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FFD60A] text-black font-heading font-black text-xs hover:bg-[#ffe033] transition-all shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>SAVE CHANGES</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
