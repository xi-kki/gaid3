import React, { useEffect, useRef, useState } from 'react';
import { ZkLoginButton } from './ZkLoginButton';

const LEFT_WORDS = ['patient', 'memory', 'walrus', 'safety'];
const RIGHT_WORDS = ['guided', 'secure', 'sovereign', 'empathy'];

interface HeroProps {
  onOpenChat?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenChat }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showZkLogin, setShowZkLogin] = useState(false);

  const handleStartOnboarding = () => {
    setShowZkLogin(true);
    setTimeout(() => onOpenChat?.(), 500);
  };

  useEffect(() => {
    const handleScrollAndResize = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionHeight = sectionRef.current.offsetHeight;
      const windowHeight = window.innerHeight;

      const totalScrollable = sectionHeight - windowHeight;
      const rawProgress = totalScrollable > 0 ? -rect.top / totalScrollable : 0;
      const clamped = Math.max(0, Math.min(1, rawProgress));

      setProgress(clamped);
      setIsMobile(window.innerWidth < 768);
    };

    handleScrollAndResize();
    window.addEventListener('scroll', handleScrollAndResize, { passive: true });
    window.addEventListener('resize', handleScrollAndResize);

    return () => {
      window.removeEventListener('scroll', handleScrollAndResize);
      window.removeEventListener('resize', handleScrollAndResize);
    };
  }, []);

  const scaleFactor = isMobile ? 0.5 : 1;
  const opacity = 0.35 + progress * 0.65;

  const layer0Offset = isMobile ? '18px' : '36px';
  const layer1Offset = isMobile ? '12px' : '24px';
  const layer2Offset = isMobile ? '6px' : '12px';

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{
        height: '120vh',
        backgroundColor: '#EC612C'
      }}
    >
      {/* Top Floating Badge */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs text-white/90 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-[#90EE90] animate-pulse"></span>
        <span className="font-medium tracking-wide">Walrus Memory Active</span>
        <span className="text-white/40">|</span>
        <span className="text-white/70">Web3 Onboarding Guide</span>
      </div>

      {/* Layer B: Sticky text overlay (z-index 5) */}
      <div className="sticky top-0 h-screen w-full z-[5] pointer-events-none">
        {/* "GAID3" stacked title */}
        <div className="absolute inset-0 flex items-start justify-center pt-[2vh] md:pt-[3vh]">
          <div className="relative leading-[0.85] tracking-tight select-none">
            <h1
              className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#89CFF0',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: `translateY(${layer0Offset})`
              }}
            >
              GAID3
            </h1>

            <h1
              className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#EC612C',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: `translateY(${layer1Offset})`
              }}
            >
              GAID3
            </h1>

            <h1
              className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#90EE90',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: `translateY(${layer2Offset})`
              }}
            >
              GAID3
            </h1>

            <h1
              className="relative font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#FFFFFF',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: 'translateY(0)'
              }}
            >
              GAID3
            </h1>
          </div>
        </div>

        {/* Side word columns */}
        <div
          className="absolute inset-0 flex items-end justify-between px-[3vw] md:px-[6vw] pointer-events-none"
          style={{ bottom: '-4vh' }}
        >
          <div className="flex flex-col gap-1 md:gap-2">
            {LEFT_WORDS.map((word, i) => {
              const leftOffset = -(120 + i * 50) * scaleFactor * (1 - progress);
              return (
                <span
                  key={word}
                  className="font-poppins uppercase text-white/80 select-none"
                  style={{
                    fontWeight: 500,
                    fontSize: 'clamp(1.6rem, 7vw, 9rem)',
                    lineHeight: 1.1,
                    opacity,
                    transform: `translateX(${leftOffset}px)`,
                    transition: 'transform 0.05s linear'
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 md:gap-2 items-end">
            {RIGHT_WORDS.map((word, i) => {
              const rightOffset = +(120 + i * 50) * scaleFactor * (1 - progress);
              return (
                <span
                  key={word}
                  className="font-poppins uppercase text-white/80 text-right select-none"
                  style={{
                    fontWeight: 500,
                    fontSize: 'clamp(1.6rem, 7vw, 9rem)',
                    lineHeight: 1.1,
                    opacity,
                    transform: `translateX(${rightOffset}px)`,
                    transition: 'transform 0.05s linear'
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Layer A: Character (z-index 10) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <img
          src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260801_104316_80b428ea-dc99-4399-afb3-8ccb7b34b2d0.png&w=1280&q=85"
          alt="Gaid3 Web3 Onboarding AI Agent"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto max-w-none block"
          style={{
            height: '115%',
            maxHeight: '115%',
            minHeight: '80%'
          }}
        />
      </div>

      {/* Bottom Actions (z-index 20) — Onboarding Flow */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-3">
        {!showZkLogin ? (
          <button
            onClick={handleStartOnboarding}
            className="group flex items-center gap-3 bg-white text-[#EC612C] font-semibold px-6 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#EC612C] group-hover:animate-ping"></span>
            <span className="font-poppins tracking-wide text-sm md:text-base">Start Safe Onboarding with Gaid3</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        ) : (
          <ZkLoginButton />
        )}
      </div>
    </section>
  );
};