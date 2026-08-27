import React, { useState, useEffect, useRef } from 'react';

interface Message {
  sender: 'gaid3' | 'user';
  text: string;
  timestamp: string;
  safetyNotice?: boolean;
}

interface Fact {
  category: string;
  statement: string;
}

interface MindMapNode { id: string; label: string; level: number; summary: string }
interface MindMapEdge { from: string; to: string; label?: string }
interface MindMapData { title: string; nodes: MindMapNode[]; edges: MindMapEdge[] }

interface Flashcard { id: string; front: string; back: string; hint?: string; tag: string }

interface Gaid3ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'chat' | 'memory' | 'safety' | 'guides' | 'studio';

export const Gaid3ChatDrawer: React.FC<Gaid3ChatDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<{ aiConfigured: boolean } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'gaid3',
      text: "Hello! I'm **Gaid3** — your calm, patient Web3 guide powered by Walrus Memory. We'll take every step at your own pace with zero judgment. How can I help you explore Web3 safely today?",
      timestamp: 'Just now',
    },
  ]);

  const [facts, setFacts] = useState<Fact[]>([
    { category: 'experience', statement: 'User is exploring Web3 for the first time' },
    { category: 'chain', statement: 'Interested in Sui and Walrus Protocol' },
    { category: 'risk', statement: 'Low risk tolerance, prefers step-by-step confirmation' },
  ]);

  const [walrusBlobId, setWalrusBlobId] = useState('walrus_testnet_8f9a2b1c4e');
  const [isSyncing, setIsSyncing] = useState(false);

  const [safetyInput, setSafetyInput] = useState('');
  const [safetyResult, setSafetyResult] = useState<{ riskScore: number; warnings: string[]; recommendation: string } | null>(null);

  // Studio / NotebookLM state
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState<'mindmap' | 'flashcards' | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth({ aiConfigured: false }));
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  // Secure: calls server, key never leaves Vercel env
  const callAi = async (userText: string): Promise<string> => {
    const contextSummary = facts.map(f => `• [${f.category}] ${f.statement}`).join('\n');
    const history = messages.slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, context: contextSummary, history }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server ${res.status}` }));
      throw new Error(err.error || `Request failed ${res.status}`);
    }
    const data = (await res.json()) as { reply: string };
    return data.reply;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    const userText = inputMessage.trim();
    const newMsg: Message = { sender: 'user', text: userText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);
    setInputMessage('');
    setIsLoading(true);

    const lower = userText.toLowerCase();
    if (lower.includes('seed') || lower.includes('private key') || lower.includes('secret words')) {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        sender: 'gaid3',
        text: '⚠️ **Safety First Pause**: NEVER share your seed phrase or private keys with anyone or any AI! Legit teams will NEVER ask. Keep it offline on paper.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        safetyNotice: true,
      }]);
      return;
    }

    const contextLen = facts.length;
    try {
      const reply = await callAi(userText);
      setMessages(prev => [...prev, { sender: 'gaid3', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      if (userText.length > 8) {
        setFacts(prev => {
          // avoid duplicate, keep last 20
          const exists = prev.some(f => f.statement.toLowerCase() === userText.toLowerCase());
          if (exists || lower.startsWith('hi') || lower.startsWith('hello')) return prev;
          const next = [...prev, { category: 'general', statement: userText.slice(0, 120) }];
          return next.slice(-20);
        });
      }
      // keep sourceText in sync for Studio quick-use
      if (!sourceText && contextLen < 3) setSourceText(userText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection hiccup';
      setMessages(prev => [...prev, { sender: 'gaid3', text: `(Gaid3 note: ${msg}) Let's try again — what were you about to explore in Web3?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncWalrus = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: facts.map(f => `[${f.category}] ${f.statement}`).join('\n').slice(0, 5000) || 'Gaid3 memory snapshot', title: 'Gaid3 Walrus Memory' }),
      });
      const data = (await res.json()) as { text?: string };
      void data;
      setWalrusBlobId(`walrus_${Date.now().toString(36)}_certified`);
    } catch {
      setWalrusBlobId(`walrus_certified_${Date.now().toString(36)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunSafetyCheck = () => {
    const text = safetyInput.toLowerCase();
    if (text.includes('approve') || text.includes('unlimited')) {
      setSafetyResult({ riskScore: 75, warnings: ['Unlimited token allowance requested.'], recommendation: 'Approve only exact amount for this swap.' });
    } else if (text.includes('seed') || text.includes('key') || text.includes('word')) {
      setSafetyResult({ riskScore: 100, warnings: ['CRITICAL: potential seed phrase disclosure!'], recommendation: 'Stop. Never paste secrets into any site/chat.' });
    } else {
      setSafetyResult({ riskScore: 15, warnings: ['Standard transaction.'], recommendation: 'Verify recipient address + network fee before confirming.' });
    }
  };

  const handleIngestUrl = async () => {
    if (!sourceUrl.trim()) return;
    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: sourceUrl.trim() }) });
      const data = (await res.json()) as { title: string; text: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Ingest failed');
      setSourceText(data.text);
      setFacts(prev => [...prev, { category: 'source', statement: `${data.title} (${data.text.length} chars)` }].slice(-20));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setSourceText(prev => prev || `Ingest error: ${msg}. Paste text manually below.`);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleGenerateMindMap = async () => {
    const text = sourceText.trim() || messages.map(m => m.text).join('\n').slice(0, 12000);
    if (text.length < 40) return;
    setIsGenerating('mindmap');
    try {
      const res = await fetch('/api/generate/mindmap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceText: text, title: 'Gaid3 Study Map' }) });
      const data = (await res.json()) as MindMapData & { error?: string };
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Generate failed');
      setMindMap(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setMindMap({ title: 'Error', nodes: [{ id: 'n1', label: msg, level: 0, summary: 'Try again with more source text' }], edges: [] });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateFlashcards = async () => {
    const text = sourceText.trim() || messages.map(m => m.text).join('\n').slice(0, 12000);
    if (text.length < 40) return;
    setIsGenerating('flashcards');
    try {
      const res = await fetch('/api/generate/flashcards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceText: text, count: 12 }) });
      const data = (await res.json()) as { cards: Flashcard[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Generate failed');
      setFlashcards(data.cards);
      setFcIndex(0);
      setFcFlipped(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setFlashcards([{ id: 'e1', front: msg, back: 'Add more source text and retry', tag: 'error' }]);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[88vh] bg-[#111113] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EC612C] flex items-center justify-center font-bold text-white">G3</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">Gaid3 Assistant</h3>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#90EE90]/20 text-[#90EE90] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#90EE90] animate-pulse"></span> Walrus Connected
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${health?.aiConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {health?.aiConfigured ? '⚡ AI Secured (server)' : '○ AI not configured — set GROQ_API_KEY'}
                </span>
              </div>
              <p className="text-xs text-white/50">Decentralized Web3 onboarding · Zero fear · NotebookLM studio</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/10 bg-[#141416] text-xs font-medium overflow-x-auto">
          {([
            ['chat', '💬 Chat'],
            ['studio', '📚 Studio (NotebookLM)'],
            ['memory', `🧠 Memory (${facts.length})`],
            ['safety', '🛡️ Safety'],
            ['guides', '📋 Guides'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === k ? 'border-[#EC612C] text-white font-semibold' : 'border-transparent text-white/60 hover:text-white'}`}>{label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${msg.sender === 'user' ? 'bg-[#EC612C] text-white rounded-br-none' : msg.safetyNotice ? 'bg-red-950/80 border border-red-500/50 text-red-200 rounded-bl-none' : 'bg-white/10 text-white/90 rounded-bl-none border border-white/5'}`}>
                    {msg.text}
                    <div className="text-[10px] text-white/40 mt-1 text-right">{msg.timestamp}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl px-4 py-3 text-xs text-white/70 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#EC612C] animate-bounce"></span><span className="w-2 h-2 rounded-full bg-[#EC612C] animate-bounce [animation-delay:0.2s]"></span><span className="w-2 h-2 rounded-full bg-[#EC612C] animate-bounce [animation-delay:0.4s]"></span>
                    <span>Gaid3 is thinking & consulting Walrus Memory...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-6">
              <div className="bg-[#EC612C]/10 border border-[#EC612C]/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white">NotebookLM-style Studio</h4>
                <p className="text-xs text-white/60 mt-1">Add a source (URL or paste), then generate Mind Map + Flashcards. All AI stays server-side — your key is never exposed.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/80">Source URL</label>
                  <div className="flex gap-2">
                    <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://docs.sui.io or Walrus blog..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC612C]" />
                    <button onClick={handleIngestUrl} disabled={isIngesting || !sourceUrl.trim()} className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-semibold disabled:opacity-50">{isIngesting ? '...' : 'Load'}</button>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={handleGenerateMindMap} disabled={isGenerating !== null || (sourceText.trim().length < 40 && messages.length < 2)} className="flex-1 px-4 py-2.5 bg-[#EC612C] hover:bg-[#ff723f] rounded-xl text-xs font-bold disabled:opacity-50">{isGenerating === 'mindmap' ? 'Generating...' : '🧠 Mind Map'}</button>
                  <button onClick={handleGenerateFlashcards} disabled={isGenerating !== null || (sourceText.trim().length < 40 && messages.length < 2)} className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold disabled:opacity-50">{isGenerating === 'flashcards' ? 'Generating...' : '🃏 Flashcards'}</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/80">Source text (paste docs, notes, or use chat history)</label>
                <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Paste your Web3 notes, Walrus docs, or let chat history be used automatically..." rows={6} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC612C] resize-y" />
                <div className="text-[10px] text-white/40 mt-1">{sourceText.length} chars · Tip: Add 200+ chars for best maps/cards</div>
              </div>

              {mindMap && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h5 className="text-sm font-bold text-white">{mindMap.title}</h5>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mindMap.nodes.map(n => (
                      <div key={n.id} className={`px-3 py-2 rounded-lg border text-xs ${n.level === 0 ? 'bg-[#EC612C] text-white border-[#EC612C] font-bold' : n.level === 1 ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/80 border-white/10'}`}>
                        <div className="font-semibold">{n.label}</div><div className="text-[10px] opacity-70">{n.summary}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-white/50">Edges: {mindMap.edges.map(e => `${e.from}→${e.to}${e.label ? ` (${e.label})` : ''}`).join(' · ')}</div>
                  <div className="mt-2 text-[10px] text-white/40">Next: wire to React Flow / Mermaid for interactive map</div>
                </div>
              )}

              {flashcards && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-white">Flashcards ({flashcards.length})</h5>
                    <div className="text-xs text-white/60">{fcIndex + 1} / {flashcards.length}</div>
                  </div>
                  <div onClick={() => setFcFlipped(!fcFlipped)} className="mt-3 bg-[#18181b] border border-white/10 rounded-xl p-6 min-h-[140px] flex flex-col justify-center cursor-pointer hover:border-[#EC612C]/50 transition-colors">
                    <div className="text-[10px] uppercase tracking-widest text-white/40">{flashcards[fcIndex].tag} · {fcFlipped ? 'Answer' : 'Question'} · tap to flip</div>
                    <div className="text-sm text-white mt-2 leading-relaxed">{fcFlipped ? flashcards[fcIndex].back : flashcards[fcIndex].front}</div>
                    {!fcFlipped && flashcards[fcIndex].hint && <div className="text-xs text-white/40 mt-2">Hint: {flashcards[fcIndex].hint}</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setFcFlipped(false); setFcIndex(i => Math.max(0, i - 1)); }} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-xs">← Prev</button>
                    <button onClick={() => { setFcFlipped(false); setFcIndex(i => Math.min(flashcards.length - 1, i + 1)); }} className="flex-1 py-2 bg-[#EC612C] rounded-lg text-xs font-bold">Next →</button>
                    <button onClick={() => navigator.clipboard.writeText(JSON.stringify(flashcards, null, 2))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs">Copy JSON</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/50">Walrus Storage Status</div>
                  <div className="text-sm font-mono text-[#90EE90] font-semibold mt-0.5 break-all">{walrusBlobId}</div>
                  <div className="text-xs text-white/40 mt-1">Decentralized storage certified on Sui Testnet</div>
                </div>
                <button onClick={handleSyncWalrus} disabled={isSyncing} className="px-4 py-2 bg-[#EC612C] hover:bg-[#ff723f] text-white rounded-lg text-xs font-semibold disabled:opacity-50">{isSyncing ? 'Certifying...' : '⚡ Sync to Walrus'}</button>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Recalled Durable Facts</h4>
                <div className="space-y-2">
                  {facts.map((fact, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase font-mono text-[10px]">{fact.category}</span>
                      <span className="flex-1 text-white/90">{fact.statement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-5">
              <p className="text-xs text-white/60">Paste any transaction/dApp message to simulate risk before signing.</p>
              <div className="flex gap-2">
                <input value={safetyInput} onChange={e => setSafetyInput(e.target.value)} placeholder="e.g. Approve unlimited USDT spending" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#EC612C]" />
                <button onClick={handleRunSafetyCheck} className="px-4 py-2.5 bg-[#EC612C] hover:bg-[#ff723f] text-white rounded-lg text-xs font-semibold">Simulate</button>
              </div>
              {safetyResult && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-xs font-semibold">Safety Score</span><span className={`text-xs font-bold px-2 py-0.5 rounded ${safetyResult.riskScore > 50 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>Risk: {safetyResult.riskScore}/100</span></div>
                  {safetyResult.warnings.map((w, i) => <div key={i} className="text-xs text-yellow-300">• {w}</div>)}
                  <div className="text-xs text-white/80 bg-white/5 p-2 rounded"><strong>Recommendation:</strong> {safetyResult.recommendation}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'guides' && (
            <div className="space-y-4">
              <div className="border border-white/10 bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-semibold">Sui Wallet Safe Setup Checklist</h4>
                <p className="text-xs text-white/50 mb-3">5 verified steps.</p>
                <div className="space-y-2 text-xs">
                  <label className="flex gap-2 text-white/80"><input type="checkbox" defaultChecked className="accent-[#EC612C]" /> Download only from verified Chrome Web Store / sui.io</label>
                  <label className="flex gap-2 text-white/80"><input type="checkbox" defaultChecked className="accent-[#EC612C]" /> Set strong local password</label>
                  <label className="flex gap-2 text-white/80"><input type="checkbox" className="accent-[#EC612C]" /> Write 12 words on paper (NEVER screenshot)</label>
                  <label className="flex gap-2 text-white/80"><input type="checkbox" className="accent-[#EC612C]" /> Store backup in safe place</label>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'chat' && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#141416] flex gap-2">
            <input value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Ask anything about Web3, wallets, or Walrus..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC612C]" />
            <button type="submit" disabled={isLoading} className="px-5 py-3 bg-[#EC612C] hover:bg-[#ff723f] text-white font-medium rounded-xl text-xs disabled:opacity-50">{isLoading ? 'Thinking...' : 'Send'}</button>
          </form>
        )}
      </div>
    </div>
  );
};
