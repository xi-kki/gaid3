import React from 'react';
import { useZkLogin } from '../hooks/useZkLogin';

interface NavbarProps {
  onOpenTab: (tab: 'chat' | 'studio' | 'safety') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTab }) => {
  const { state, loginDemo, logout } = useZkLogin();

  const shortAddress =
    state.status === 'ready'
      ? `${state.address.slice(0, 6)}…${state.address.slice(-4)}`
      : null;

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl">
      <nav className="flex items-center justify-between px-4 md:px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#EC612C] to-[#ff8552] flex items-center justify-center font-bold text-white text-xs shadow-md">
            G3
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-wide text-sm leading-none font-poppins">GAID3</span>
            <span className="text-[10px] text-white/50 tracking-wider uppercase font-mono">Walrus Sovereign AI</span>
          </div>
        </div>

        {/* Quick Nav Launchers */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10 text-xs">
          <button
            onClick={() => onOpenTab('chat')}
            className="px-3.5 py-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <span>💬</span>
            <span>Guide Chat</span>
          </button>
          <button
            onClick={() => onOpenTab('studio')}
            className="px-3.5 py-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <span>📚</span>
            <span>Notebook Studio</span>
          </button>
          <button
            onClick={() => onOpenTab('safety')}
            className="px-3.5 py-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <span>🛡️</span>
            <span>Safety Sandbox</span>
          </button>
        </div>

        {/* zkLogin / Wallet Status Pill */}
        <div className="flex items-center gap-2">
          {shortAddress ? (
            <div className="flex items-center gap-2 bg-white/10 border border-[#90EE90]/40 rounded-full px-3 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#90EE90] animate-pulse" />
              <span className="font-mono text-white/90 text-[11px]">{shortAddress}</span>
              <button
                onClick={logout}
                className="text-[10px] text-white/40 hover:text-white underline ml-1"
                title="Disconnect"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={loginDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:scale-105 active:scale-95 transition-all shadow"
            >
              <span>⚡</span>
              <span>1-Click Wallet</span>
            </button>
          )}

          {/* Open Drawer Trigger */}
          <button
            onClick={() => onOpenTab('chat')}
            className="px-3 py-1.5 rounded-full bg-[#EC612C] text-white font-semibold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
          >
            <span>Launch Suite</span>
            <span>→</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
