import React, { useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Gaid3ChatDrawer } from './components/Gaid3ChatDrawer';

export const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'studio' | 'safety'>('chat');

  const handleOpenTab = (tab: 'chat' | 'studio' | 'safety') => {
    setActiveTab(tab);
    setIsChatOpen(true);
  };

  return (
    <main className="min-h-screen w-full bg-black text-white selection:bg-[#EC612C] selection:text-white relative">

      {/* Hero Section */}
      <Hero onOpenChat={() => handleOpenTab('chat')} />

      {/* Marquee Banner */}
      <Marquee />

      {/* Persistent Floating Quick Action Button (FAB) */}
      <aside aria-label="Quick launch assistant" className="fixed bottom-6 right-6 z-30 flex items-center gap-2">
        <button
          onClick={() => handleOpenTab('chat')}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#EC612C] to-[#ff7d4d] text-white font-semibold text-xs md:text-sm shadow-[0_8px_30px_rgb(236,97,44,0.4)] hover:shadow-[0_8px_35px_rgb(236,97,44,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Open Gaid3 AI Companion (Press G or Space)"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
          <MessageSquare className="w-4 h-4 text-white" />
          <span>Ask Gaid3</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/25 text-[10px] font-mono text-white/80 border border-white/20">
            Space
          </span>
        </button>
      </aside>

      {/* Gaid3 Chat & Walrus Studio Drawer */}
      <Gaid3ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeTab={activeTab}
      />
    </main>
  );
};

export default App;
