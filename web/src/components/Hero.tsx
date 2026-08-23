import React, { useEffect, useRef, useState } from 'react';

const LEFT_WORDS = ['spark', 'imagine', 'evolve', 'render'];
const RIGHT_WORDS = ['blaze', 'genesis', 'purpose', 'ignite'];

export const Hero: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

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

  // Title layer offsets
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
      {/* Layer B: Sticky text overlay (z-index 5) */}
      <div className="sticky top-0 h-screen w-full z-[5] pointer-events-none">
        {/* "BEYOND" stacked title */}
        <div className="absolute inset-0 flex items-start justify-center pt-[2vh] md:pt-[3vh]">
          <div className="relative leading-[0.85] tracking-tight select-none">
            {/* Layer 0 (back) - #89CFF0 */}
            <h1
              className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#89CFF0',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: `translateY(${layer0Offset})`
              }}
            >
              BEYOND
            </h1>

            {/* Layer 1 - #EC612C */}
            <h1
              className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#EC612C',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: `translateY(${layer1Offset})`
              }}
            >
              BEYOND
            </h1>

            {/* Layer 2 - #90EE90 */}
            <h1
              className="absolute inset-0 font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#90EE90',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: `translateY(${layer2Offset})`
              }}
            >
              BEYOND
            </h1>

            {/* Layer 3 (front) - #FFFFFF */}
            <h1
              className="relative font-bamboly uppercase select-none pointer-events-none"
              style={{
                color: '#FFFFFF',
                fontSize: 'clamp(7.5rem, 30vw, 28rem)',
                transform: 'translateY(0)'
              }}
            >
              BEYOND
            </h1>
          </div>
        </div>

        {/* Side word columns */}
        <div
          className="absolute inset-0 flex items-end justify-between px-[3vw] md:px-[6vw] pointer-events-none"
          style={{ bottom: '-8vh' }}
        >
          {/* Left Column */}
          <div className="flex flex-col gap-1 md:gap-2">
            {LEFT_WORDS.map((word, i) => {
              const leftOffset = -(60 + i * 40) * scaleFactor * (1 - progress);
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

          {/* Right Column */}
          <div className="flex flex-col gap-1 md:gap-2 items-end">
            {RIGHT_WORDS.map((word, i) => {
              const rightOffset = +(60 + i * 40) * scaleFactor * (1 - progress);
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
          alt="Beyond Hero Character"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto max-w-none block"
          style={{
            height: '115%',
            maxHeight: '115%',
            minHeight: '80%'
          }}
        />
      </div>
    </section>
  );
};
