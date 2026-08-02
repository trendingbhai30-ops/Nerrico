import React, { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types/api';
import { api } from '../services/api';
import { StatusBadge } from '../components/UI/StatusBadge';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { Plus, Trash2, Video, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errors';

interface DashboardPageProps {
  onSelectProject: (id: string) => void;
  onNewVideo: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectProject, onNewVideo }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError, showSuccess } = useToast();

  const fetchProjects = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) setIsRefreshing(true);
      try {
        const res = await api.getProjects();
        setProjects(res.projects || []);
      } catch (err) {
        showError(getErrorMessage(err, 'Failed to load projects'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteProject(deleteTarget.id);
      showSuccess(`Deleted "${deleteTarget.title}"`);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to delete project'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading text-white tracking-tight">PROJECTS</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your AI-generated YouTube Shorts, track pipeline status & preview renderings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProjects(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Refresh projects list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onNewVideo}
            className="px-5 py-3 rounded-xl bg-[#FFD60A] text-black font-heading font-black text-sm hover:bg-[#ffe033] transition-all shadow-lg shadow-[#FFD60A]/15 hover:scale-[1.02] flex items-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ NEW VIDEO</span>
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#18181B] border border-zinc-800/80 rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-40 bg-zinc-800/60 rounded-xl w-full" />
              <div className="h-6 bg-zinc-800/60 rounded-md w-3/4" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 bg-zinc-800/60 rounded-full w-24" />
                <div className="h-4 bg-zinc-800/60 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="bg-[#18181B]/50 border border-zinc-800/80 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#FFD60A] flex items-center justify-center mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading text-xl text-white">NO VIDEOS GENERATED YET</h3>
            <p className="text-sm text-zinc-400">
              Start by pasting research notes and choosing a voice to create your first viral Short!
            </p>
          </div>
          <button
            onClick={onNewVideo}
            className="px-6 py-3 rounded-xl bg-[#FFD60A] text-black font-heading font-black text-sm hover:bg-[#ffe033] transition-all shadow-xl shadow-[#FFD60A]/20 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>CREATE FIRST VIDEO</span>
          </button>
        </div>
      ) : (
        /* Project Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const thumbnailUrl = api.getMediaUrl(project.thumbnailUrl);

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group bg-[#18181B] hover:bg-[#1E1E22] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail / Aspect Container */}
                  <div className="relative aspect-video bg-zinc-900 border-b border-zinc-800/60 overflow-hidden flex items-center justify-center">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-600">
                        <Video className="w-10 h-10 stroke-[1.5]" />
                        <span className="text-xs font-mono uppercase tracking-wider">No Thumbnail</span>
                      </div>
                    )}

                    {/* Status Badge overlay */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={project.status} size="sm" />
                    </div>

                    {/* Delete button overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-red-950/80 border border-white/10 hover:border-red-500/50 text-zinc-400 hover:text-red-300 backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Info */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-heading text-lg text-white group-hover:text-[#FFD60A] transition-colors line-clamp-2 leading-snug">
                      {project.title}
                    </h3>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-zinc-800/40 mt-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 pt-3">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{formatDate(project.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1 font-semibold text-[#FFD60A] opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all pt-3">
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Project?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Project"
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
