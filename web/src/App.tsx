import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Gaid3ChatDrawer } from './components/Gaid3ChatDrawer';

export const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <main className="min-h-screen w-full bg-black text-white selection:bg-hero selection:text-white relative">
      <Hero onOpenChat={() => setIsChatOpen(true)} />
      <Marquee />
      <Gaid3ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </main>
  );
};

export default App;
