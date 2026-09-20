import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Gaid3ChatDrawer } from './components/Gaid3ChatDrawer';

export const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'chat' | 'studio' | 'safety'>('chat');

  const handleOpenTab = (tab: 'chat' | 'studio' | 'safety' = 'chat') => {
    setDrawerTab(tab);
    setIsChatOpen(true);
  };

  return (
    <main className="min-h-screen w-full bg-black text-white selection:bg-[#EC612C] selection:text-white relative font-sans">
      <Navbar onOpenTab={handleOpenTab} />
      <Hero onOpenChat={handleOpenTab} />
      <Marquee />
      <Gaid3ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeTab={drawerTab}
      />
    </main>
  );
};

export default App;
