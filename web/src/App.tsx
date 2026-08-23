import React from 'react';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen w-full bg-black text-white selection:bg-hero selection:text-white">
      <Hero />
      <Marquee />
    </main>
  );
};

export default App;
