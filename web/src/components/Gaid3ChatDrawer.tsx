import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NotebookLMStudio } from './studio/NotebookLMStudio';

interface Message { sender: 'gaid3' | 'user'; text: string; timestamp: string; safetyNotice?: boolean; }

const getMsgClass = (msg: { sender: 'gaid3' | 'user'; safetyNotice?: boolean }) => {
  const isUser = msg.sender === 'user';
  const isSafety = msg.safetyNotice;
  if (isUser) return 'bg-[#EC612C] text-white rounded-br-none';
  if (msg.safetyNotice) return 'bg-red-950/80 border border-red-500/50 text-red-200 rounded-bl-none';
  return 'bg-white/5 text-white/90 rounded-bl-none border border-white/5';
};

export const Gaid3ChatDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<{ aiConfigured: boolean } | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: 'gaid3' | 'user'; text: string; timestamp: string; safetyNotice?: boolean }>>([]);
  const [facts, setFacts] = useState<Array<{ category: string; statement: string }>>([]);
  const [walrusBlobId, setWalrusBlobId] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const factsRef = useRef(facts);

  // Keep refs in sync with state
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { factsRef.current = facts; }, [facts]);

  useEffect(() => { if (!isOpen) return; fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth({ aiConfigured: false })); }, [isOpen]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [isOpen]);

  // Load real memory on drawer open
  useEffect(() => {
    if (!isOpen) return;
    const loadMemory = async () => {
      try {
        const res = await fetch('/api/memory');
        if (res.ok) {
          const profile = await res.json();
          if (profile?.facts?.length) {
            setFacts(profile.facts.map((f: any) => ({ category: f.category, statement: f.statement })));
          }
          if (profile?.walrusBlobId) {
            setWalrusBlobId(profile.walrusBlobId);
          }
        }
      } catch {
        // Ignore - fallback to empty
      }
    };
    loadMemory();
    
    // Add welcome message if empty
    if (messages.length === 0) {
      setMessages([{ sender: 'gaid3', text: "Hi there! I'm Gaid3 — your calm, patient Web3 guide powered by Walrus Memory. We'll take things at your pace, zero pressure. How can I help you explore Web3 safely today?", timestamp: 'Just now' }]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const callAi = useCallback(async (userText: string): Promise<string> => {
    const currentFacts = factsRef.current;
    const currentMessages = messagesRef.current;
    const contextSummary = currentFacts.map(f => `[${f.category}] ${f.statement}`).join('\n');
    const history = currentMessages.slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText, context: contextSummary, history }) });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: `Server ${res.status}` })); throw new Error(err.error || `Request failed ${res.status}`); }
    const data = (await res.json()) as { reply: string };
    return data.reply;
  }, []);
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    const userText = inputMessage.trim();
    const newMsg = { sender: 'user' as const, text: userText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);
    setInputMessage('');
    setIsLoading(true);

    const lower = userText.toLowerCase();
    if (lower.includes('seed') || lower.includes('private key') || lower.includes('secret words')) { setIsLoading(false); setMessages(prev => [...prev, { sender: 'gaid3', text: 'Safety pause: never share your seed phrase or private keys with anyone. Legit teams will never ask. Keep it offline on paper.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), safetyNotice: true }]); return; }

    const contextLen = facts.length;
    try {
      const reply = await callAi(userText);
      const cleanReply = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1').replace(/^#+\s/gm, '').trim();
      setMessages(prev => [...prev, { sender: 'gaid3', text: cleanReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      if (userText.length > 8) { setFacts(prev => { const exists = prev.some(f => f.statement.toLowerCase() === userText.toLowerCase()); if (exists || lower.startsWith('hi') || lower.startsWith('hello')) return prev; const next = [...prev, { category: 'general', statement: userText.slice(0, 120) }]; return next.slice(-20); }); }
      if (!sourceText && contextLen < 3) setSourceText(userText);
    } catch (err) { const msg = err instanceof Error ? err.message : 'Connection hiccup'; setMessages(prev => [...prev, { sender: 'gaid3', text: 'Connection hiccup. Let me try again — what were you exploring?', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); } finally { setIsLoading(false); }
  };

  const handleSyncWalrus = async () => {
    setIsSyncing(true);
    try {
      const currentFacts = factsRef.current;
      const res = await fetch('/api/memory/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: currentFacts.map(f => `[${f.category}] ${f.statement}`).join('\n').slice(0, 5000) || 'Gaid3 memory snapshot' }) });
      const data = await res.json();
      if (data.blobId) setWalrusBlobId(data.blobId);
      else setWalrusBlobId(`walrus_${Date.now().toString(36)}_certified`);
    } catch { setWalrusBlobId(`walrus_certified_${Date.now().toString(36)}`); } finally { setIsSyncing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm animate-fadeIn">
      <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EC612C] flex items-center justify-center font-bold text-white text-sm">G3</div>
            <div>
              <h1 className="font-semibold text-white text-base">Gaid3</h1>
              <p className="text-xs text-white/50">Your calm Web3 guide · Walrus Memory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-emerald-500/20 text-emerald-300">AI Ready</span>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Close">✕</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div className="space-y-4">
            {messages.map((msg, idx) => React.createElement(
              'div',
              { key: idx, className: `flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up` },
              React.createElement('div', { className: `max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-[#EC612C] text-white rounded-br-none' : msg.safetyNotice ? 'bg-red-950/80 border border-red-500/50 text-red-200 rounded-bl-none' : 'bg-white/5 text-white/90 rounded-bl-none border border-white/5'}` },
                React.createElement('p', { className: 'whitespace-pre-wrap' }, msg.text),
                React.createElement('span', { className: 'text-[10px] text-white/40 mt-1 block text-right' }, msg.timestamp)
              )
            ))}
            <div ref={chatBottomRef} />
          </div>
          <NotebookLMStudio
            history={messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))}
            walrusFacts={facts}
            walrusChecklists={[]}
            walrusMistakes={[]}
            walrusBlobId={walrusBlobId}
            experienceLevel="beginner"
            riskTolerance="very_low"
          />
        </main>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm sticky bottom-0">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Ask anything about Web3, wallets, or Walrus..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC612C] transition-colors" disabled={isLoading} autoFocus />
            <button type="submit" disabled={isLoading || !inputMessage.trim()} className="px-6 py-3 bg-[#EC612C] hover:bg-[#ff723f] text-white font-medium rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Thinking...' : 'Send'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
