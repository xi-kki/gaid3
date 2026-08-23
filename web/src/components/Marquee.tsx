import React from 'react';

const MARQUEE_TEXT = 'WALRUS MEMORY · CALM ONBOARDING · ZERO FEAR · DECENTRALIZED · SOVEREIGN AI · STEP BY STEP · WEB3 MADE SAFE · GAID3 · ';

export const Marquee: React.FC = () => {
  return (
    <div className="w-full bg-white overflow-hidden py-6 md:py-8 select-none">
      <div className="marquee-track">
        {/* Render 4 identical copies side-by-side (shrink-0) for seamless -50% loop */}
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className="shrink-0 font-bamboly uppercase font-bold"
            style={{
              color: '#EC612C',
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              lineHeight: 1,
              paddingRight: '0.25em'
            }}
          >
            {MARQUEE_TEXT}
          </span>
        ))}
      </div>
    </div>
  );
};
