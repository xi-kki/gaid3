import React from 'react';
import { useZkLogin } from '../hooks/useZkLogin';

export const ZkLoginButton: React.FC = () => {
  const { state, login, loginDemo, logout, hasClientId } = useZkLogin();

  if (state.status === 'ready') {
    const short = `${state.address.slice(0, 6)}…${state.address.slice(-4)}`;
    return (
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-[#90EE90]/50 rounded-full px-3.5 py-1.5 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-[#90EE90] animate-pulse" />
        <span className="text-xs font-mono text-white/95">{short}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#90EE90]/20 text-[#90EE90] font-semibold tracking-wide">
          {state.isDemo ? 'Testnet Wallet ✓' : 'zkLogin ✓'}
        </span>
        <button
          onClick={logout}
          className="text-[11px] text-white/50 hover:text-white transition-colors ml-1 underline"
          title="Disconnect wallet session"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-xs text-white/90 shadow-xl">
        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-[#EC612C] rounded-full animate-spin" />
        <span>Authenticating sovereign session…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={login}
          className="group flex items-center gap-2.5 bg-white text-black font-semibold px-5 py-2.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs md:text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <button
          onClick={loginDemo}
          className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white/90 border border-white/20 font-medium px-4 py-2.5 rounded-full backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 transition-all text-xs"
        >
          <span>⚡</span>
          <span>1-Click Testnet</span>
        </button>
      </div>

      {state.status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-200 bg-red-950/80 border border-red-500/30 rounded-xl px-3 py-1.5 max-w-[340px] text-center">
          <span>⚠️ {state.error}</span>
        </div>
      )}
    </div>
  );
};
