import React, { useState, useEffect } from 'react';
import type { Voice } from '../types/api';
import { api } from '../services/api';
import { AudioPlayer } from '../components/UI/AudioPlayer';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/errors';
import { Sparkles, Mic, ArrowLeft, Loader2, Check } from 'lucide-react';

interface NewVideoPageProps {
  onBack: () => void;
  onProjectCreated: (id: string) => void;
}

export const NewVideoPage: React.FC<NewVideoPageProps> = ({ onBack, onProjectCreated }) => {
  const [title, setTitle] = useState('');
  const [research, setResearch] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const res = await api.getVoices();
        const voiceList = res.voices || [];
        setVoices(voiceList);
        if (voiceList.length > 0) {
          setVoiceId(voiceList[0].id);
        }
      } catch (err) {
        showError(getErrorMessage(err, 'Failed to fetch voice options'));
      } finally {
        setIsLoadingVoices(false);
      }
    };
    loadVoices();
  }, [showError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError('Please enter a video title');
      return;
    }
    if (!research.trim()) {
      showError('Please paste your research content');
      return;
    }
    if (!voiceId) {
      showError('Please select a voice for narration');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create project
      const created = await api.createProject({
        title: title.trim(),
        research: research.trim(),
        voiceId,
      });

      showSuccess('Project created! Generating script...');

      // 2. Trigger script generation immediately
      await api.generateScript(created.id);

      // 3. Navigate to Project Page
      onProjectCreated(created.id);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to initiate video generation'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-3xl sm:text-4xl font-heading text-white tracking-tight">NEW VIDEO</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Provide research materials and select a voiceover artist to generate your Short script.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="video-title" className="block text-sm font-heading text-zinc-200 uppercase tracking-wider">
            1. Video Title / Topic <span className="text-[#FFD60A]">*</span>
          </label>
          <input
            id="video-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Why Roman Concrete Self-Heals Under Water"
            disabled={isSubmitting}
            className="w-full px-4 py-3.5 bg-[#18181B] border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] text-base transition-colors"
          />
        </div>

        {/* Research Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="research-content" className="block text-sm font-heading text-zinc-200 uppercase tracking-wider">
              2. Paste Research Material <span className="text-[#FFD60A]">*</span>
            </label>
            <span className="text-xs text-zinc-500 font-mono">Any length (Articles, Bullet points, Notes)</span>
          </div>
          <textarea
            id="research-content"
            value={research}
            onChange={(e) => setResearch(e.target.value)}
            placeholder="Paste your raw research, Wikipedia excerpts, transcript, or bullet points here..."
            rows={8}
            disabled={isSubmitting}
            className="w-full p-4 bg-[#18181B] border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] font-mono text-sm leading-relaxed transition-colors resize-y"
          />
        </div>

        {/* Voice Picker */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-heading text-zinc-200 uppercase tracking-wider">
              3. Select Voice Narrator <span className="text-[#FFD60A]">*</span>
            </label>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-[#FFD60A]" /> Preview samples inline
            </span>
          </div>

          {isLoadingVoices ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-[#18181B] border border-zinc-800 rounded-xl animate-pulse p-4" />
              ))}
            </div>
          ) : voices.length === 0 ? (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-sm text-zinc-400">
              No voice narrators found. Make sure the backend is running.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {voices.map((voice) => {
                const isSelected = voiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => setVoiceId(voice.id)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#FFD60A]/10 border-[#FFD60A] ring-1 ring-[#FFD60A]/50 shadow-lg shadow-[#FFD60A]/10'
                        : 'bg-[#18181B] hover:bg-[#1E1E22] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-heading text-base text-white flex items-center gap-2">
                          <span>{voice.name}</span>
                          {isSelected && (
                            <span className="p-0.5 rounded-full bg-[#FFD60A] text-black">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] uppercase font-mono tracking-wider">
                            {voice.accent}
                          </span>
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] capitalize font-mono">
                            {voice.gender}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <AudioPlayer sampleUrl={voice.sampleUrl} name={voice.name} />
                      <span className="text-[10px] text-zinc-500 font-mono">ID: {voice.id.substring(0, 6)}...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-4 rounded-xl bg-[#FFD60A] text-black font-heading font-black text-base hover:bg-[#ffe033] transition-all shadow-xl shadow-[#FFD60A]/20 hover:scale-[1.02] flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>GENERATING SCRIPT...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-current" />
                <span>START SCRIPT GENERATION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
