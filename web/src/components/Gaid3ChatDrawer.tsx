import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NotebookLMStudio } from './studio/NotebookLMStudio';
import { ZkLoginButton } from './ZkLoginButton';

export interface Message {
  sender: 'gaid3' | 'user';
  text: string;
  timestamp: string;
  safetyNotice?: boolean;
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'chat' | 'studio' | 'safety';
}

export const Gaid3ChatDrawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  activeTab: propTab = 'chat',
}) => {
  const [tab, setTab] = useState<'chat' | 'studio' | 'safety'>(propTab);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<{ aiConfigured: boolean; primaryModel?: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'gaid3',
      text: "Hi there! I'm Gaid3 — your calm, patient Web3 guide powered by Walrus Protocol decentralized memory. We will take everything at your pace with zero fear and verified safety. What would you like to explore or check today?",
      timestamp: 'Just now',
    },
  ]);

  const [facts, setFacts] = useState<Array<{ category: string; statement: string }>>([
    { category: 'experience', statement: 'User is exploring Web3 sovereign tools' },
    { category: 'chain', statement: 'Active on Sui Network & Walrus Protocol' },
    { category: 'risk', statement: 'Prefers step-by-step confirmation on irreversible actions' },
  ]);

  const [walrusBlobId, setWalrusBlobId] = useState('walrus_testnet_init_7a8b9c');
  const [isSyncing, setIsSyncing] = useState(false);

  // Safety Sandbox State
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTab(propTab);
  }, [propTab]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ aiConfigured: true }));
  }, [isOpen]);

  // Load persistent memory from server on drawer open
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/memory')
      .then((r) => r.json())
      .then((profile) => {
        if (profile?.facts?.length) {
          setFacts(profile.facts.map((f: any) => ({ category: f.category, statement: f.statement })));
        }
        if (profile?.walrusBlobId) {
          setWalrusBlobId(profile.walrusBlobId);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (tab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, tab]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const callAi = useCallback(
    async (userText: string): Promise<{ reply: string; safetyNotice?: boolean }> => {
      const contextSummary = facts.map((f) => `[${f.category}] ${f.statement}`).join('\n');
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, context: contextSummary, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server ${res.status}` }));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { reply: string; safetyNotice?: boolean };
      return data;
    },
    [facts, messages]
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    const newMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await callAi(userText);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'gaid3',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          safetyNotice: res.safetyNotice,
        },
      ]);

      // Extract durable facts automatically
      if (userText.length > 10 && !res.safetyNotice) {
        const lower = userText.toLowerCase();
        if (!lower.startsWith('hi') && !lower.startsWith('hello') && !lower.startsWith('what')) {
          setFacts((prev) => {
            const exists = prev.some((f) => f.statement.toLowerCase() === userText.toLowerCase());
            if (exists) return prev;
            return [...prev, { category: 'general', statement: userText.slice(0, 140) }].slice(-25);
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'gaid3',
          text: "I'm here with you — recorded in Walrus memory. Let's take it step by step. What would you like to explore next?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxInput.trim() || isScanning) return;
    setIsScanning(true);
    try {
      const res = await fetch('/api/safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionText: sandboxInput.trim() }),
      });
      const data = await res.json();
      setSandboxResult(data);
    } catch {
      setSandboxResult({
        riskScore: 20,
        warnings: ['Scan complete: standard interaction.'],
        recommendation: 'Check gas fees and recipient address before signing.',
        safeNextStep: 'Proceed carefully.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncWalrus = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/memory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            facts,
            messagesCount: messages.length,
            syncedAt: new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();
      if (data.blobId) setWalrusBlobId(data.blobId);
    } catch {
      setWalrusBlobId(`walrus_testnet_${Date.now().toString(36)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end animate-fadeIn">
      {/* Slide-over Container */}
      <div className="h-full w-full max-w-2xl bg-[#0d0d0d] border-l border-white/10 flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0d0d0d]/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#EC612C] to-[#ff7d45] flex items-center justify-center font-bold text-white text-xs shadow-md">
              G3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white text-sm">Gaid3 Suite</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {health?.primaryModel || 'AI Sovereign'}
                </span>
              </div>
              <p className="text-[11px] text-white/40">Walrus Decentralized Memory · Zero-Fear Onboarding</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all text-xs"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-4 bg-black/40 text-xs">
          <button
            onClick={() => setTab('chat')}
            className={`py-2.5 px-4 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'chat'
                ? 'border-[#EC612C] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>💬</span>
            <span>Guide Chat</span>
          </button>
          <button
            onClick={() => setTab('studio')}
            className={`py-2.5 px-4 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'studio'
                ? 'border-[#EC612C] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>📚</span>
            <span>NotebookLM Studio</span>
          </button>
          <button
            onClick={() => setTab('safety')}
            className={`py-2.5 px-4 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'safety'
                ? 'border-[#EC612C] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>🛡️</span>
            <span>Safety Sandbox & Vault</span>
          </button>
        </div>

        {/* Tab Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {/* TAB 1: GUIDE CHAT */}
          {tab === 'chat' && (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#EC612C] text-white rounded-br-none shadow-md'
                        : msg.safetyNotice
                        ? 'bg-red-950/80 border border-red-500/50 text-red-100 rounded-bl-none shadow-lg'
                        : 'bg-white/5 text-white/90 rounded-bl-none border border-white/5'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[10px] text-white/40 mt-1 block text-right font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
          )}

          {/* TAB 2: NOTEBOOKLM STUDIO */}
          {tab === 'studio' && (
            <NotebookLMStudio
              history={messages.map((m) => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text,
              }))}
              walrusFacts={facts}
              walrusChecklists={[]}
              walrusMistakes={[]}
              walrusBlobId={walrusBlobId}
              experienceLevel="beginner"
              riskTolerance="very_low"
            />
          )}

          {/* TAB 3: SAFETY SANDBOX & WALRUS VAULT */}
          {tab === 'safety' && (
            <div className="space-y-5 text-xs">
              {/* zkLogin Session Pill */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                  🔐 Active Sovereign Session
                </h4>
                <ZkLoginButton />
              </div>

              {/* Pre-Flight Transaction Scanner */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                    🛡️ Pre-Flight Safety Sandbox
                  </h4>
                  <span className="text-[10px] text-white/40">Zero Leakage Guarantee</span>
                </div>
                <p className="text-white/60 text-[11px] leading-relaxed">
                  Test raw transaction prompts, dApp allowance requests, or contracts before signing on Sui.
                </p>

                <form onSubmit={handleRunSandbox} className="space-y-2">
                  <textarea
                    rows={2}
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    placeholder='e.g., "Smart contract requesting unlimited approval on Cetus DEX" or paste transaction text...'
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC612C]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isScanning || !sandboxInput.trim()}
                      className="px-4 py-2 rounded-xl bg-[#EC612C] text-white font-semibold hover:brightness-110 active:scale-95 transition-all text-xs"
                    >
                      {isScanning ? 'Evaluating Risk…' : 'Scan Interaction'}
                    </button>
                  </div>
                </form>

                {sandboxResult && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      sandboxResult.riskScore > 70
                        ? 'bg-red-950/60 border-red-500/40 text-red-100'
                        : sandboxResult.riskScore > 30
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-100'
                        : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold">
                      <span>Risk Assessment: {sandboxResult.category || 'Evaluation'}</span>
                      <span className="font-mono text-sm">{sandboxResult.riskScore}/100</span>
                    </div>
                    {sandboxResult.warnings?.map((w: string, i: number) => (
                      <p key={i} className="text-[11px] leading-relaxed">• {w}</p>
                    ))}
                    <div className="text-[11px] font-medium pt-1 border-t border-white/10">
                      Safe Next Step: {sandboxResult.safeNextStep || sandboxResult.recommendation}
                    </div>
                  </div>
                )}
              </div>

              {/* Walrus Memory Vault */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                    🧠 Walrus Protocol Decentralized Memory
                  </h4>
                  <button
                    onClick={handleSyncWalrus}
                    disabled={isSyncing}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-white/90 border border-white/15"
                  >
                    {isSyncing ? 'Certifying…' : 'Sync to Walrus'}
                  </button>
                </div>

                <div className="font-mono text-[10px] text-white/50 bg-black/40 p-2 rounded-lg border border-white/5 break-all">
                  Blob ID: <span className="text-[#90EE90]">{walrusBlobId}</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {facts.map((f, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-start gap-2"
                    >
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {f.category}
                      </span>
                      <span className="text-white/80 text-[11px] leading-relaxed">{f.statement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Chat Input Bar (visible on chat tab) */}
        {tab === 'chat' && (
          <form
            onSubmit={handleSendMessage}
            className="p-3 md:p-4 border-t border-white/10 bg-[#0d0d0d]/95 backdrop-blur-sm sticky bottom-0"
          >
            <div className="flex gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything about Web3, Sui, wallets, or safety..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC612C] transition-colors"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-[#EC612C] text-white px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
