import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface AudioPlayerProps {
  sampleUrl: string;
  name: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ sampleUrl, name }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fullUrl = api.getMediaUrl(sampleUrl) || '';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current) {
      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.addEventListener('waiting', () => setIsLoading(true));
      audio.addEventListener('playing', () => {
        setIsLoading(false);
        setIsPlaying(true);
      });
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('error', () => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Audio play error:', err);
          setIsLoading(false);
          setIsPlaying(false);
        });
    }
  };

  return (
    <button
      type="button"
      onClick={togglePlay}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        isPlaying
          ? 'bg-[#FFD60A] text-black border-[#FFD60A] shadow-md shadow-[#FFD60A]/20'
          : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border-zinc-700'
      }`}
      title={`Listen to sample for ${name}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPlaying ? (
        <Pause className="w-3.5 h-3.5 fill-current" />
      ) : (
        <Play className="w-3.5 h-3.5 fill-current" />
      )}
      <span>{isPlaying ? 'Pause Sample' : 'Sample'}</span>
    </button>
  );
};
