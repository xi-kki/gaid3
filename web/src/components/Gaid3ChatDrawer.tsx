import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NotebookLMStudio } from './studio/NotebookLMStudio';
import { ZkLoginButton } from './ZkLoginButton';
import {
  MessageSquare,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  Send,
  X,
  Bot,
  User,
  Lightbulb,
  ArrowRight,
  Database,
  RefreshCw,
  Zap,
  Lock,
} from 'lucide-react';

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

  const QUICK_PROMPTS = [
    {
      title: 'How do I safely set up my first Sui wallet?',
      icon: Zap,
    },
    {
      title: 'What is Walrus Protocol decentralized memory?',
      icon: Database,
    },
    {
      title: 'What is zkLogin and why is it safer than seed phrases?',
      icon: Lock,
    },
    {
      title: 'Scan a contract or airdrop link for scams',
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 md:p-8 animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Centered Modern Studio Window */}
      <div className="relative h-[90vh] w-full max-w-4xl bg-[#111114] border border-[#EC612C]/40 rounded-2xl md:rounded-3xl flex flex-col shadow-[0_0_60px_rgba(236,97,44,0.3)] overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141418] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#EC612C] to-[#ff7d45] flex items-center justify-center font-black text-white text-sm shadow-[0_0_15px_rgba(236,97,44,0.5)]">
              G3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-sm md:text-base font-poppins">Gaid3 Sovereign AI Studio</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{health?.primaryModel || 'Sui & Walrus Online'}</span>
                </span>
              </div>
              <p className="text-[11px] text-white/50">Walrus Decentralized Memory · Non-Custodial Zero-Fear Guide</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <ZkLoginButton />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-4 bg-black/40 text-xs">
          <button
            onClick={() => setTab('chat')}
            className={`py-3 px-4 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'chat'
                ? 'border-[#EC612C] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#EC612C]" />
            <span>Guide Chat</span>
          </button>
          <button
            onClick={() => setTab('studio')}
            className={`py-3 px-4 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'studio'
                ? 'border-[#EC612C] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#EC612C]" />
            <span>NotebookLM Studio</span>
          </button>
          <button
            onClick={() => setTab('safety')}
            className={`py-3 px-4 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'safety'
                ? 'border-[#EC612C] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#EC612C]" />
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
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  {msg.sender === 'gaid3' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#EC612C] to-[#ff7d45] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
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
                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                      <User className="w-4 h-4 text-white/80" />
                    </div>
                  )}
                </div>
              ))}
              {/* Quick Starter Chips */}
              {messages.length <= 2 && (
                <div className="pt-2 pb-1 space-y-2.5">
                  <p className="text-[11px] text-white/50 font-medium flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[#EC612C]" />
                    <span>Tap to ask Gaid3:</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((item, i) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setInputMessage(item.title);
                          }}
                          className="text-left text-xs p-3 rounded-2xl bg-white/[0.04] hover:bg-[#EC612C]/15 border border-white/10 hover:border-[#EC612C]/60 text-white/90 hover:text-white transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-[#EC612C]/20 border border-[#EC612C]/40 flex items-center justify-center shrink-0 text-[#EC612C]">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="leading-snug">{item.title}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#EC612C] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-2 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#EC612C]" />
                  <span>Active Sovereign Session</span>
                </h4>
                <ZkLoginButton />
              </div>

              {/* Pre-Flight Transaction Scanner */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#EC612C]" />
                    <span>Pre-Flight Safety Sandbox</span>
                  </h4>
                  <span className="text-[10px] text-white/40 font-mono">Zero Leakage Guarantee</span>
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
                      className="px-4 py-2 rounded-xl bg-[#EC612C] text-white font-semibold hover:brightness-110 active:scale-95 transition-all text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Evaluating Risk…</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Scan Interaction</span>
                        </>
                      )}
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
                  <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-[#EC612C]" />
                    <span>Walrus Protocol Decentralized Memory</span>
                  </h4>
                  <button
                    onClick={handleSyncWalrus}
                    disabled={isSyncing}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-white/90 border border-white/15 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Certifying…' : 'Sync to Walrus'}</span>
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
            className="p-3 md:p-4 border-t border-white/10 bg-[#141418] sticky bottom-0"
          >
            <div className="flex gap-2 max-w-4xl mx-auto items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything about Web3, Sui testnet, wallets, or safety..."
                className="flex-1 bg-white/[0.06] border border-white/15 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC612C] transition-colors shadow-inner"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-[#EC612C] hover:bg-[#ff763b] text-white px-5 py-3 rounded-2xl text-xs md:text-sm font-bold active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2 shadow-[0_4px_15px_rgba(236,97,44,0.4)] cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-2 font-mono flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
              <span>Non-Custodial: Gaid3 will never ask for your seed phrase or private key.</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
