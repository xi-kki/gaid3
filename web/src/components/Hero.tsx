import React, { useEffect, useState } from 'react';
import { ZkLoginButton } from './ZkLoginButton';

interface HeroProps {
  onOpenChat?: (tab?: 'chat' | 'studio' | 'safety') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenChat }) => {
  const [showZkLogin, setShowZkLogin] = useState(false);

  // Listen for zkLogin completion and auto-open chat drawer
  useEffect(() => {
    const handleZkLoginReady = () => {
      setShowZkLogin(false);
      setTimeout(() => onOpenChat?.('chat'), 300);
    };
    window.addEventListener('gaid3:zklogin:ready', handleZkLoginReady as EventListener);
    return () => window.removeEventListener('gaid3:zklogin:ready', handleZkLoginReady as EventListener);
  }, [onOpenChat]);

  const handleStartOnboarding = () => {
    setShowZkLogin(true);
  };

  return (
    <section className="relative w-full min-h-screen overflow-hidden flex flex-col pt-16 pb-8" style={{ backgroundColor: '#EC612C' }}>
      {/* Top Floating Badge */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 md:px-4 py-1 rounded-full border border-white/20 text-xs md:text-sm text-white/90 shadow-lg">
        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#90EE90] animate-pulse"></span>
        <span className="font-medium tracking-wide">Walrus Memory Active</span>
        <span className="text-white/40">|</span>
        <span className="text-white/70">Web3 Onboarding Sovereign Guide</span>
      </div>

      {/* Main Content - centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 relative z-10 my-auto">
        {/* "GAID3" stacked title */}
        <div className="relative leading-[0.85] tracking-tight select-none mb-6 md:mb-10">
          <h1 className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none" style={{ color: '#89CFF0', fontSize: 'clamp(5rem, 18vw, 16rem)', transform: 'translateY(24px)' }}>
            GAID3
          </h1>
          <h1 className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none" style={{ color: '#EC612C', fontSize: 'clamp(5rem, 18vw, 16rem)', transform: 'translateY(16px)' }}>
            GAID3
          </h1>
          <h1 className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none" style={{ color: '#90EE90', fontSize: 'clamp(5rem, 18vw, 16rem)', transform: 'translateY(8px)' }}>
            GAID3
          </h1>
          <h1 className="relative font-bamboly uppercase select-none pointer-events-none" style={{ color: '#FFFFFF', fontSize: 'clamp(5rem, 18vw, 16rem)' }}>
            GAID3
          </h1>
        </div>

        {/* Side word columns */}
        <div className="flex items-center justify-between w-full max-w-5xl px-4 md:px-8 mb-6 md:mb-10">
          <div className="flex flex-col gap-1 md:gap-2">
            {['patient', 'memory', 'walrus', 'safety'].map((word) => (
              <span key={word} className="font-poppins uppercase text-white/70 select-none" style={{ fontWeight: 500, fontSize: 'clamp(1rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                {word}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1 md:gap-2 items-end">
            {['guided', 'secure', 'sovereign', 'empathy'].map((word) => (
              <span key={word} className="font-poppins uppercase text-white/70 text-right select-none" style={{ fontWeight: 500, fontSize: 'clamp(1rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Character Image */}
        <div className="flex items-end justify-center w-full mb-6 md:mb-8 flex-1 min-h-0">
          <img
            src="/gaid3-new.png"
            alt="Gaid3 Web3 Onboarding AI Agent"
            className="w-full max-w-[85vw] md:max-w-[60vw] lg:max-w-[48vw] h-auto max-h-[42vh] md:max-h-[48vh] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Descriptive Text */}
        <div className="text-center px-4 md:px-8 mb-6">
          <p className="font-poppins text-white/90 text-sm md:text-base lg:text-lg max-w-3xl leading-relaxed tracking-wide mx-auto font-medium">
            Your AI companion to safe Web3 onboarding — no seed phrases, zero fear, sovereign zkLogin & Walrus memory on Sui.
          </p>
          <p className="font-poppins text-[#90EE90]/90 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed mx-auto">
            Powered by Walrus decentralized memory & zkLogin. Your keys, your data, your sovereignty.
          </p>
        </div>

        {/* Bottom Actions — Onboarding Flow */}
        <div className="pointer-events-auto flex flex-col items-center gap-3 w-full max-w-md mx-auto">
          {!showZkLogin ? (
            <div className="flex flex-col items-center gap-2.5 w-full">
              <button
                onClick={handleStartOnboarding}
                className="group w-full flex items-center justify-center gap-3 bg-white text-[#EC612C] font-semibold px-6 py-3.5 rounded-full shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC612C] group-hover:animate-ping"></span>
                <span className="font-poppins tracking-wide text-sm md:text-base">Start Safe Onboarding with Gaid3</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              
              <button
                onClick={() => onOpenChat?.('chat')}
                className="text-xs text-white/70 hover:text-white underline"
              >
                Or open AI guide chat directly
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-center">
              <ZkLoginButton />
              <button
                onClick={() => setShowZkLogin(false)}
                className="text-xs text-white/50 hover:text-white underline mt-1"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Quick Suite Jump Links */}
          <div className="flex items-center gap-2 text-[11px] text-white/80 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mt-1">
            <span>Explore:</span>
            <button onClick={() => onOpenChat?.('studio')} className="hover:text-white underline">
              Notebook Studio
            </button>
            <span>·</span>
            <button onClick={() => onOpenChat?.('safety')} className="hover:text-white underline">
              Safety Sandbox
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};