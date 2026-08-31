import React, { useState } from 'react';

type ToolType = 'mindmap' | 'flashcards' | 'quiz' | 'summary' | 'podcast' | 'ask' | 'search' | 'simplify';

interface Props {
  history: Array<{ role: string; content: string }>;
  walrusFacts: Array<{ category: string; statement: string }>;
  walrusChecklists: Array<{ title: string }>;
  walrusMistakes: Array<{ remedyLesson: string }>;
  walrusBlobId?: string;
  experienceLevel?: string;
  riskTolerance?: string;
}

const TOOLS: Array<{ id: ToolType; label: string; icon: string; desc: string }> = [
  { id: 'mindmap', label: 'Mind Map', icon: '🧠', desc: '12-22 nodes from memory+chat' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏', desc: '12 Q/A cards' },
  { id: 'quiz', label: 'Quiz', icon: '📝', desc: '5 MCQs with explanations' },
  { id: 'summary', label: 'Summary', icon: '📄', desc: '200-word + takeaways' },
  { id: 'podcast', label: 'Podcast', icon: '🎙️', desc: '2-speaker script' },
  { id: 'ask', label: 'Ask', icon: '💬', desc: 'Q&A with citations' },
  { id: 'search', label: 'Search', icon: '🔍', desc: 'Vector search memory' },
  { id: 'simplify', label: 'Simplify', icon: '🎓', desc: 'Explain concepts simply' },
];

export const NotebookLMStudio: React.FC<Props> = ({ history, walrusFacts, walrusChecklists, walrusMistakes, walrusBlobId, experienceLevel, riskTolerance }) => {
  const [active, setActive] = useState<ToolType | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');

  const canGenerate = history.length >= 2 || walrusFacts.length > 0;

  async function generate(type: ToolType) {
    setActive(type);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        history: history.slice(-20).map(m => ({ role: m.role, content: m.content })),
        walrusFacts, walrusChecklists, walrusMistakes, walrusBlobId, experienceLevel, riskTolerance, type,
        title: 'Gaid3 Learning Session',
      };
      if (type === 'ask' || type === 'search' || type === 'simplify') {
        if (!question.trim()) { setError('Enter a question to ask'); setLoading(false); return; }
        body.question = question;
      }
      if (type === 'quiz') body.count = 5;
      if (type === 'flashcards') body.count = 12;
      const r = await fetch('/api/generate/from-memory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) setError(j.error || 'Failed');
      else setResult(j);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    setLoading(false);
  }

  if (!canGenerate) {
    return <div className="text-xs text-white/40 p-3 border border-white/10 rounded-lg bg-white/[0.02]">💡 Chat a bit or let Walrus remember something — then turn your learning into study tools.</div>;
  }

  return (
    <div className="space-y-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-widest text-white/80">NOTEBOOKLM STUDIO — FROM MEMORY + CHAT</h4>
        <span className="text-[10px] text-white/40">{history.length} turns · {walrusFacts.length} facts · {walrusBlobId ? 'Walrus ✓' : 'Walrus ○'}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => generate(t.id)}
            disabled={loading}
            className={`p-2 rounded-lg border text-left transition ${active===t.id ? 'bg-[#EC612C] text-white border-[#EC612C]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90'} ${loading ? 'opacity-50' : ''}`}
          >
            <div className="text-sm">{t.icon} {t.label}</div>
            <div className="text-[10px] opacity-60">{t.desc}</div>
          </button>
        ))}
      </div>

      {(active==='ask' || active==='search' || active==='simplify') && (
        <div className="flex gap-2">
          <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder={active==='ask' ? 'Ask Walrus memory e.g. What is seed phrase?' : active==='search' ? 'Search e.g. wallet safety' : 'e.g. Simplify What is zkLogin'} className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder:text-white/30" />
          <button onClick={()=>generate(active!)} disabled={loading} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium">Go</button>
        </div>
      )}

      {loading && <div className="text-xs text-white/60 animate-pulse">Generating {active} from Walrus + chat…</div>}
      {error && <div className="text-xs text-red-300 bg-red-950/30 border border-red-500/30 p-2 rounded">{error}</div>}
      {result !== null && typeof result === 'object' && (result as { answer?: string }).answer ? (
        <div className="max-h-[320px] overflow-auto p-3 rounded-lg bg-black/40 border border-white/10 text-sm text-white/90 whitespace-pre-wrap">
          {(result as { answer: string }).answer}
          <div className="mt-2">
            <button onClick={()=> navigator.clipboard.writeText((result as { answer: string }).answer)} className="px-2 py-1 rounded bg-white/10 text-[11px]">Copy Text</button>
          </div>
        </div>
      ) : (
      <div className="max-h-[320px] overflow-auto p-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white/80 whitespace-pre-wrap">
          {String(JSON.stringify(result, null, 2)).slice(0, 8000)}
          <div className="mt-2 flex gap-2">
            <button onClick={()=> navigator.clipboard.writeText(JSON.stringify(result, null, 2))} className="px-2 py-1 rounded bg-white/10 text-[11px]">Copy JSON</button>
            <button onClick={()=> fetch('/api/memory/sync', {method:'POST', body: JSON.stringify({ snapshot: result })}).catch(()=>{})} className="px-2 py-1 rounded bg-[#EC612C] text-[11px] text-white">Save to Walrus</button>
          </div>
        </div>
      )}
    </div>
  );
};
