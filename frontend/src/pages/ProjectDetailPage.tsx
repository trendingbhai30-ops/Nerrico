import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Project, ProjectStatus } from '../types/api';
import { api } from '../services/api';
import { StatusBadge } from '../components/UI/StatusBadge';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/errors';
import { calculateScriptStats } from '../utils/format';
import { PROJECT_POLL_INTERVAL_MS } from '../config/constants';
import {
  ArrowLeft,
  FileText,
  Mic,
  Sparkles,
  Video,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Download,
  Save,
  Play,
  RotateCcw,
  Clock,
  Type,
} from 'lucide-react';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
}

const TRANSITIONAL_STATUSES: ProjectStatus[] = [
  'created',
  'scripting',
  'voicing',
  'planning_scenes',
  'rendering',
];

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedScript, setEditedScript] = useState<string>('');
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const { showError, showSuccess } = useToast();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProjectDetail = useCallback(
    async (isInitial = false) => {
      try {
        const data = await api.getProject(projectId);
        setProject((prev) => {
          if (isInitial || (data.script && prev?.script !== data.script)) {
            setEditedScript(data.script || '');
          }
          return data;
        });
      } catch (err) {
        if (isInitial) {
          showError(getErrorMessage(err, 'Failed to load project details'));
        }
      } finally {
        if (isInitial) setIsLoading(false);
      }
    },
    [projectId, showError]
  );

  useEffect(() => {
    fetchProjectDetail(true);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchProjectDetail]);

  useEffect(() => {
    if (!project) return;

    const isTransitional = TRANSITIONAL_STATUSES.includes(project.status);

    if (isTransitional) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          fetchProjectDetail(false);
        }, PROJECT_POLL_INTERVAL_MS);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [project?.status, fetchProjectDetail, project]);

  const handleSaveScript = async () => {
    if (!editedScript.trim()) {
      showError('Script cannot be empty');
      return;
    }
    setIsSavingScript(true);
    try {
      await api.updateScript(projectId, editedScript.trim());
      showSuccess('Script saved successfully');
      setProject((prev) => (prev ? { ...prev, script: editedScript.trim() } : null));
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to save script changes'));
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      if (editedScript !== project?.script) {
        await api.updateScript(projectId, editedScript.trim());
      }
      await api.approveProject(projectId);
      showSuccess('Approved! Starting video rendering pipeline...');
      fetchProjectDetail(false);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to approve script'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await api.retryProject(projectId);
      showSuccess('Retrying pipeline from failed step...');
      fetchProjectDetail(false);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to trigger retry'));
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#FFD60A] animate-spin mx-auto" />
        <p className="text-zinc-400 font-mono text-sm">Loading project pipeline details...</p>
      </div>
    );
  }

  const { words, estDuration } = calculateScriptStats(editedScript);

  const steps: {
    id: number;
    key: string;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 1,
      key: 'script',
      title: 'Script Writing',
      description: 'AI generates viral Hook, Body & CTA',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 2,
      key: 'voiceover',
      title: 'Voiceover Synthesis',
      description: 'Generate high-fidelity audio narration',
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: 3,
      key: 'planning',
      title: 'Scene Planning',
      description: 'Pacing, visual assets & prompt layout',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 4,
      key: 'rendering',
      title: 'Video Rendering',
      description: 'Combine captions, visuals & audio into 9:16 Short',
      icon: <Video className="w-5 h-5" />,
    },
    {
      id: 5,
      key: 'done',
      title: 'Done & Ready',
      description: 'Export final 1080x1920 MP4 video',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
  ];

  const getStepState = (stepId: number) => {
    const s = project.status;
    if (s === 'failed') return 'failed';

    switch (stepId) {
      case 1:
        if (['created', 'scripting'].includes(s)) return 'active';
        return 'completed';
      case 2:
        if (['created', 'scripting', 'script_ready'].includes(s)) return 'upcoming';
        if (s === 'voicing') return 'active';
        return 'completed';
      case 3:
        if (['created', 'scripting', 'script_ready', 'voicing'].includes(s)) return 'upcoming';
        if (s === 'planning_scenes') return 'active';
        return 'completed';
      case 4:
        if (['created', 'scripting', 'script_ready', 'voicing', 'planning_scenes'].includes(s)) return 'upcoming';
        if (s === 'rendering') return 'active';
        return 'completed';
      case 5:
        if (s === 'done') return 'completed';
        return 'upcoming';
      default:
        return 'upcoming';
    }
  };

  const videoUrl = api.getMediaUrl(project.videoUrl);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-heading text-white tracking-tight leading-tight">
                {project.title}
              </h1>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-1">ID: {project.id}</p>
          </div>
        </div>

        <div>
          <StatusBadge status={project.status} size="lg" />
        </div>
      </div>

      {/* Main Grid: Vertical Stepper & Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Vertical Stepper (4 cols) */}
        <div className="lg:col-span-4 bg-[#18181B] border border-zinc-800/80 rounded-2xl p-6 space-y-6 h-fit">
          <h3 className="font-heading text-sm text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 pb-3">
            PIPELINE PROGRESS
          </h3>

          <div className="relative space-y-6">
            <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-zinc-800 -z-0" />

            {steps.map((step) => {
              const state = getStepState(step.id);

              return (
                <div key={step.id} className="relative z-10 flex items-start gap-4 group">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      state === 'completed'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
                        : state === 'active'
                        ? 'bg-[#FFD60A] text-black border-[#FFD60A] shadow-lg shadow-[#FFD60A]/20 scale-105'
                        : state === 'failed' && step.id === 1
                        ? 'bg-red-950 text-red-400 border-red-800'
                        : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                    }`}
                  >
                    {state === 'active' && project.status !== 'script_ready' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`font-heading text-sm ${
                          state === 'active'
                            ? 'text-[#FFD60A]'
                            : state === 'completed'
                            ? 'text-zinc-200'
                            : 'text-zinc-500'
                        }`}
                      >
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Step Workspace / Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {project.status === 'scripting' && (
            <div className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-10 text-center space-y-4 glow-yellow-sm">
              <Loader2 className="w-12 h-12 text-[#FFD60A] animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="font-heading text-xl text-white">WRITING YOUR SCRIPT…</h3>
                <p className="text-sm text-zinc-400">
                  Synthesizing hook, structure & engaging narrative from your research material.
                </p>
              </div>
            </div>
          )}

          {project.status === 'script_ready' && (
            <div className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="font-heading text-xl text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#FFD60A]" />
                    REVIEW & EDIT SCRIPT
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Fine-tune wording before generating audio narration and video layout.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 px-4 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Type className="w-4 h-4 text-[#FFD60A]" />
                    <span>
                      <strong className="text-white">{words}</strong> words
                    </span>
                  </div>
                  <div className="h-4 w-px bg-zinc-800" />
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Clock className="w-4 h-4 text-[#FFD60A]" />
                    <span>
                      Est. <strong className="text-white">{estDuration}s</strong> duration
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  rows={12}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono text-sm leading-relaxed focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-colors resize-y"
                  placeholder="Script content..."
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={handleSaveScript}
                  disabled={isSavingScript || isApproving}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Edits</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving || isSavingScript}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#FFD60A] text-black font-heading font-black text-sm hover:bg-[#ffe033] transition-all shadow-xl shadow-[#FFD60A]/20 hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>STARTING GENERATION...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>APPROVE & GENERATE VIDEO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {['voicing', 'planning_scenes', 'rendering'].includes(project.status) && (
            <div className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FFD60A]/10 border border-[#FFD60A]/30 text-[#FFD60A] flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-xl text-white uppercase tracking-tight">
                  {project.progress?.step || `Processing ${project.status.replace('_', ' ')}...`}
                </h3>
                <p className="text-sm text-zinc-400">
                  Please keep this page open. Polling automatically updates status.
                </p>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className="h-full bg-[#FFD60A] rounded-full transition-all duration-500 shadow-lg shadow-[#FFD60A]/50"
                    style={{ width: `${Math.max(project.progress?.percent || 5, 5)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>Progress</span>
                  <span className="text-[#FFD60A] font-bold">{project.progress?.percent || 0}%</span>
                </div>
              </div>
            </div>
          )}

          {project.status === 'done' && (
            <div className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-6 space-y-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <h3 className="font-heading text-xl text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  VIDEO GENERATED SUCCESSFULLY
                </h3>
              </div>

              <div className="relative aspect-[9/16] max-h-[70vh] w-full max-w-[360px] bg-black rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-2xl">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    poster={api.getMediaUrl(project.thumbnailUrl) || undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
                    Video stream unavailable
                  </div>
                )}
              </div>

              {videoUrl && (
                <a
                  href={videoUrl}
                  download={`${project.title.replace(/[^a-z0-9]/gi, '_')}_Short.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full max-w-[360px] py-4 rounded-xl bg-[#FFD60A] text-black font-heading font-black text-base hover:bg-[#ffe033] transition-all shadow-xl shadow-[#FFD60A]/20 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>DOWNLOAD SHORT (MP4)</span>
                </a>
              )}
            </div>
          )}

          {project.status === 'failed' && (
            <div className="bg-[#1C0F13] border border-red-500/40 rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-red-950 border border-red-800 text-red-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-heading text-lg text-white">GENERATION FAILED</h3>
                  <p className="text-sm text-red-200 font-mono bg-red-950/60 border border-red-900/50 p-3 rounded-lg leading-relaxed">
                    {project.error || 'An unexpected error occurred during rendering pipeline execution.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-red-900/40">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-sm transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>RETRY GENERATION</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
