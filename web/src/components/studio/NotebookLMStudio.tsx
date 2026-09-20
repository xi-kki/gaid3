import React, { useState } from 'react';
import {
  FlashcardViewer,
  QuizPlayer,
  MindMapVisualizer,
  PodcastPlayer,
  SummaryViewer,
} from './InteractiveCards';

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
  { id: 'mindmap', label: 'Mind Map', icon: '🧠', desc: 'Concept hierarchy tree' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏', desc: '3D interactive study cards' },
  { id: 'quiz', label: 'Quiz', icon: '📝', desc: '5 MCQs with explanations' },
  { id: 'summary', label: 'Summary', icon: '📄', desc: 'Overview + key takeaways' },
  { id: 'podcast', label: 'Podcast', icon: '🎙️', desc: '2-speaker dialogue with audio' },
  { id: 'ask', label: 'Ask Memory', icon: '💬', desc: 'Q&A with citations' },
  { id: 'search', label: 'Vector Search', icon: '🔍', desc: 'Search decentralized memory' },
  { id: 'simplify', label: 'Simplify', icon: '🎓', desc: 'Explain Web3 simply' },
];

export const NotebookLMStudio: React.FC<Props> = ({
  history,
  walrusFacts,
  walrusChecklists,
  walrusMistakes,
  walrusBlobId,
  experienceLevel,
  riskTolerance,
}) => {
  const [active, setActive] = useState<ToolType | null>('flashcards');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [savedToWalrus, setSavedToWalrus] = useState(false);

  const canGenerate = history.length >= 1 || walrusFacts.length > 0;

  async function generate(type: ToolType) {
    setActive(type);
    setLoading(true);
    setError('');
    setResult(null);
    setSavedToWalrus(false);

    try {
      const body: Record<string, unknown> = {
        history: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        walrusFacts,
        walrusChecklists,
        walrusMistakes,
        walrusBlobId,
        experienceLevel,
        riskTolerance,
        type,
        title: 'Gaid3 Sovereign Learning Session',
      };

      if (type === 'ask' || type === 'search' || type === 'simplify') {
        if (!question.trim()) {
          setError('Enter a question or topic first');
          setLoading(false);
          return;
        }
        body.question = question;
      }
      if (type === 'quiz') body.count = 5;
      if (type === 'flashcards') body.count = 8;

      const r = await fetch('/api/generate/from-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const j = await r.json();
      if (!r.ok) {
        setError(j.error || 'Generation failed');
      } else {
        setResult(j);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    }
    setLoading(false);
  }

  const handleSaveWalrus = async () => {
    if (!result) return;
    try {
      await fetch('/api/memory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: result,
          title: `Gaid3 Studio: ${active}`,
        }),
      });
      setSavedToWalrus(true);
    } catch {}
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-2xl">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">📚</span>
            <h3 className="text-xs md:text-sm font-semibold tracking-wider text-white uppercase font-poppins">
              NotebookLM Web3 Studio
            </h3>
          </div>
          <p className="text-[11px] text-white/50">Turn onboarding chat & Walrus memory into study tools</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
            {walrusFacts.length} Facts · {walrusBlobId ? 'Walrus Active' : 'Sovereign Cache'}
          </span>
        </div>
      </div>

      {/* Tool Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => generate(t.id)}
            disabled={loading}
            className={`p-2.5 rounded-xl border text-left transition-all group ${
              active === t.id
                ? 'bg-[#EC612C] text-white border-[#EC612C] shadow-lg shadow-[#EC612C]/20 scale-[1.02]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90 hover:border-white/20'
            } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex items-center gap-1.5 font-medium text-xs">
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </div>
            <div className={`text-[10px] mt-0.5 truncate ${active === t.id ? 'text-white/80' : 'text-white/40'}`}>
              {t.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Ask / Search / Simplify Query Bar */}
      {(active === 'ask' || active === 'search' || active === 'simplify') && (
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate(active)}
            placeholder={
              active === 'ask'
                ? 'Ask Walrus memory e.g. "What is a seed phrase and why is it risky?"'
                : active === 'search'
                ? 'Search memory e.g. "Sui wallet precautions"'
                : 'e.g. "Explain zkLogin like I am 15"'
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC612C]"
          />
          <button
            onClick={() => generate(active)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 active:scale-95 transition-all shadow"
          >
            Generate
          </button>
        </div>
      )}

      {/* Loading Status */}
      {loading && (
        <div className="flex items-center justify-center gap-2.5 p-6 rounded-xl bg-black/30 border border-white/5 text-xs text-white/70 animate-pulse">
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-[#EC612C] rounded-full animate-spin" />
          <span>Synthesizing {active} from Walrus memory + chat context…</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-200 bg-red-950/60 border border-red-500/30 p-3 rounded-xl flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => generate(active || 'flashcards')} className="underline text-[11px]">Retry</button>
        </div>
      )}

      {/* Interactive Render Result */}
      {result && !loading && (
        <div className="space-y-3 pt-1">
          {/* 1. Flashcards */}
          {active === 'flashcards' && result.data?.cards && (
            <FlashcardViewer cards={result.data.cards} />
          )}

          {/* 2. Quiz */}
          {active === 'quiz' && result.data?.quiz && (
            <QuizPlayer quiz={result.data.quiz} />
          )}

          {/* 3. Mind Map */}
          {active === 'mindmap' && result.data?.nodes && (
            <MindMapVisualizer data={result.data} />
          )}

          {/* 4. Podcast */}
          {active === 'podcast' && result.data?.script && (
            <PodcastPlayer data={result.data} />
          )}

          {/* 5. Summary */}
          {active === 'summary' && result.data?.summary && (
            <SummaryViewer data={result.data} />
          )}

          {/* 6. Plain Text / Ask / Search / Simplify */}
          {(result.answer || typeof result === 'string') && (
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs md:text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
              {result.answer || result}
            </div>
          )}

          {/* Result Footer with Walrus Storage & Copy */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
            <span className="text-white/40">
              Source: <span className="font-mono text-white/70">{result.source || 'Walrus AI'}</span>
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = result.answer || JSON.stringify(result.data || result, null, 2);
                  navigator.clipboard.writeText(text);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
              >
                Copy Output
              </button>

              <button
                onClick={handleSaveWalrus}
                disabled={savedToWalrus}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  savedToWalrus
                    ? 'bg-[#90EE90]/20 text-[#90EE90] border border-[#90EE90]/30'
                    : 'bg-[#EC612C] text-white hover:brightness-110 active:scale-95'
                }`}
              >
                {savedToWalrus ? '✓ Saved on Walrus' : 'Certify to Walrus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!canGenerate && !result && !loading && (
        <div className="text-xs text-white/40 p-4 border border-white/10 rounded-xl bg-black/20 text-center">
          💡 Chat with Gaid3 or explore safety checklists to populate your Walrus memory, then turn your session into interactive study tools!
        </div>
      )}
    </div>
  );
};
