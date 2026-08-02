import React from 'react';
import type { ProjectStatus } from '../../types/api';
import { Loader2, CheckCircle2, AlertCircle, FileText, Mic, Sparkles, Video } from 'lucide-react';

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case 'created':
        return {
          label: 'Created',
          bg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
          icon: <FileText className="w-3.5 h-3.5" />,
        };
      case 'scripting':
        return {
          label: 'Scripting...',
          bg: 'bg-blue-950/70 text-blue-300 border-blue-800/60',
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />,
        };
      case 'script_ready':
        return {
          label: 'Script Ready',
          bg: 'bg-[#FFD60A]/15 text-[#FFD60A] border-[#FFD60A]/40 font-semibold',
          icon: <FileText className="w-3.5 h-3.5 text-[#FFD60A]" />,
        };
      case 'voicing':
        return {
          label: 'Voicing...',
          bg: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
          icon: <Mic className="w-3.5 h-3.5 animate-pulse text-purple-400" />,
        };
      case 'planning_scenes':
        return {
          label: 'Planning Scenes...',
          bg: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
          icon: <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />,
        };
      case 'rendering':
        return {
          label: 'Rendering Video...',
          bg: 'bg-pink-950/70 text-pink-300 border-pink-800/60',
          icon: <Video className="w-3.5 h-3.5 animate-pulse text-pink-400" />,
        };
      case 'done':
        return {
          label: 'Ready / Done',
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60 font-semibold',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'failed':
        return {
          label: 'Failed',
          bg: 'bg-red-950/80 text-red-300 border-red-800/60',
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
        };
      default:
        return {
          label: status,
          bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: null,
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm tracking-wide ${config.bg} ${sizeClasses}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
