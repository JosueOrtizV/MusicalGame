import React, { useSyncExternalStore } from 'react';
import { MusicIcon } from './Icons';

const emptySubscribe = () => () => {};

export function FloatingMusicNotes() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      <MusicIcon size={64} className="text-[#ffabf3]/10 absolute top-[20%] left-[15%] music-float" style={{ animationDelay: '0s' }} />
      <MusicIcon size={80} className="text-[#f4dcec]/10 absolute bottom-[30%] right-[10%] music-float" style={{ animationDelay: '2s' }} />
      <MusicIcon size={40} className="text-[#cdcd00]/10 absolute top-[50%] right-[5%] music-float" style={{ animationDelay: '4s' }} />
      <MusicIcon size={50} className="text-[#00fbfb]/10 absolute top-[10%] right-[25%] music-float" style={{ animationDelay: '1s' }} />
      <MusicIcon size={70} className="text-[#ffabf3]/10 absolute bottom-[15%] left-[20%] music-float" style={{ animationDelay: '3s' }} />
      <MusicIcon size={45} className="text-[#f4dcec]/10 absolute top-[40%] left-[5%] music-float" style={{ animationDelay: '5s' }} />
      <MusicIcon size={60} className="text-[#00fbfb]/10 absolute bottom-[50%] left-[35%] music-float" style={{ animationDelay: '1.5s' }} />
      <MusicIcon size={55} className="text-[#cdcd00]/10 absolute top-[70%] right-[30%] music-float" style={{ animationDelay: '3.5s' }} />
    </div>
  );
}
