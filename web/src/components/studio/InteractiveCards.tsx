import React, { useState } from 'react';

// --- 1. Flashcard Component ---
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  tag?: string;
}

export const FlashcardViewer: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (!cards || cards.length === 0) return null;
  const current = cards[index];

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    setIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto my-2">
      <div className="flex justify-between w-full text-xs text-white/50 px-1 font-mono">
        <span>CARD {index + 1} OF {cards.length}</span>
        {current.tag && <span className="px-2 py-0.5 rounded bg-white/10 text-white/80">{current.tag}</span>}
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-52 cursor-pointer perspective-1000 select-none group"
      >
        <div
          className={`relative w-full h-full duration-500 transform-style-3d transition-transform rounded-2xl border p-5 flex flex-col justify-between shadow-2xl ${
            isFlipped
              ? 'bg-gradient-to-br from-[#1a1410] to-[#2a170d] border-[#EC612C]/60 rotate-y-180'
              : 'bg-white/[0.04] border-white/15 hover:border-white/30'
          }`}
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div className="flex justify-between items-center text-xs text-white/40">
            <span>{isFlipped ? 'ANSWER' : 'QUESTION'}</span>
            <span className="text-[11px] text-[#EC612C] group-hover:underline">Click to flip ↷</span>
          </div>

          <div className="my-auto text-center px-2">
            <p className="text-base md:text-lg font-medium text-white/95 leading-snug">
              {isFlipped ? current.back : current.front}
            </p>
          </div>

          <div className="flex justify-between items-center text-xs text-white/40 pt-2 border-t border-white/5">
            {current.hint && !isFlipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(!showHint);
                }}
                className="text-[11px] text-amber-300/80 hover:text-amber-200 underline"
              >
                {showHint ? `Hint: ${current.hint}` : '💡 View Hint'}
              </button>
            )}
            <span className="text-[10px] text-white/30 ml-auto">Walrus Verified</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePrev}
          className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-all active:scale-95"
        >
          ← Prev
        </button>
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-4 py-1.5 rounded-full bg-[#EC612C] text-white text-xs font-medium shadow hover:brightness-110 active:scale-95 transition-all"
        >
          {isFlipped ? 'Show Question' : 'Reveal Answer'}
        </button>
        <button
          onClick={handleNext}
          className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-all active:scale-95"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// --- 2. Interactive Quiz Stepper ---
export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty?: string;
}

export const QuizPlayer: React.FC<{ quiz: QuizItem[] }> = ({ quiz }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (!quiz || quiz.length === 0) return null;
  const current = quiz[currentIdx];

  const handleSelect = (option: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    if (option.toLowerCase() === current.answer.toLowerCase() || option.startsWith(current.answer.toLowerCase())) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    if (currentIdx + 1 < quiz.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-4 max-w-md mx-auto">
        <div className="text-3xl">🏆</div>
        <h4 className="text-base font-semibold text-white">Quiz Completed!</h4>
        <p className="text-sm text-white/70">
          You scored <span className="font-bold text-[#90EE90]">{score}</span> out of{' '}
          <span className="font-bold text-white">{quiz.length}</span>
        </p>
        <button
          onClick={handleReset}
          className="px-5 py-2 rounded-full bg-[#EC612C] text-white text-xs font-semibold hover:brightness-110 active:scale-95"
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 my-2">
      <div className="flex justify-between items-center text-xs text-white/50 border-b border-white/5 pb-2">
        <span className="font-mono">QUESTION {currentIdx + 1} OF {quiz.length}</span>
        <span className="text-[#90EE90] font-mono">Score: {score}</span>
      </div>

      <h4 className="text-sm md:text-base font-medium text-white leading-relaxed">
        {current.question}
      </h4>

      <div className="space-y-2">
        {current.options.map((opt, i) => {
          const isSelected = selectedOption === opt;
          const isCorrect =
            opt.toLowerCase() === current.answer.toLowerCase() ||
            opt.toLowerCase().startsWith(current.answer.toLowerCase());
          let btnStyle = 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90';

          if (selectedOption !== null) {
            if (isCorrect) {
              btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200';
            } else if (isSelected) {
              btnStyle = 'bg-red-950/70 border-red-500 text-red-200';
            } else {
              btnStyle = 'bg-white/[0.02] border-white/5 text-white/40';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={selectedOption !== null}
              className={`w-full p-3 rounded-xl border text-left text-xs md:text-sm transition-all flex items-center justify-between ${btnStyle}`}
            >
              <span>{opt}</span>
              {selectedOption !== null && isCorrect && <span className="text-emerald-400 font-bold">✓</span>}
              {selectedOption !== null && isSelected && !isCorrect && <span className="text-red-400 font-bold">✕</span>}
            </button>
          );
        })}
      </div>

      {selectedOption !== null && (
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
          <p className="text-white/80 leading-relaxed">💡 {current.explanation}</p>
          <div className="flex justify-end">
            <button
              onClick={handleNextQuestion}
              className="px-4 py-1.5 rounded-full bg-[#EC612C] text-white text-xs font-semibold shadow hover:brightness-110"
            >
              {currentIdx + 1 < quiz.length ? 'Next Question →' : 'View Final Score'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. Visual Mind Map Component ---
export interface MindMapData {
  title?: string;
  nodes?: Array<{ id: string; label: string; level: number; summary?: string }>;
  edges?: Array<{ from: string; to: string; label?: string }>;
}

export const MindMapVisualizer: React.FC<{ data: MindMapData }> = ({ data }) => {
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; summary?: string } | null>(null);

  const nodes = data.nodes || [];
  const root = nodes.find((n) => n.level === 0) || nodes[0];
  const branches = nodes.filter((n) => n.level === 1);
  const leaves = nodes.filter((n) => n.level > 1);

  return (
    <div className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider">
          🧠 {data.title || 'Mind Map Structure'}
        </h4>
        <span className="text-[10px] text-white/40">{nodes.length} Concepts Map</span>
      </div>

      {/* Hierarchical Visual Flow */}
      <div className="space-y-4 py-2">
        {/* Root Node */}
        {root && (
          <div className="flex justify-center">
            <div
              onClick={() => setSelectedNode(root)}
              className="cursor-pointer px-4 py-2 rounded-xl bg-[#EC612C] text-white font-semibold text-sm shadow-xl hover:scale-105 transition-transform"
            >
              ⭐ {root.label}
            </div>
          </div>
        )}

        {/* Level 1 Branches */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {branches.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedNode(b)}
              className="cursor-pointer p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-[#EC612C]/60 text-xs"
            >
              <div className="font-medium text-white/90">🔹 {b.label}</div>
              {b.summary && <div className="text-[10px] text-white/50 truncate mt-0.5">{b.summary}</div>}
            </div>
          ))}
        </div>

        {/* Level 2 Leaves */}
        {leaves.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {leaves.map((l) => (
              <span
                key={l.id}
                onClick={() => setSelectedNode(l)}
                className="cursor-pointer text-[10px] px-2.5 py-1 rounded-full bg-black/40 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-colors"
              >
                • {l.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Selected Node Inspector */}
      {selectedNode && (
        <div className="p-3 rounded-xl bg-black/60 border border-[#EC612C]/40 text-xs space-y-1">
          <div className="font-semibold text-white flex items-center justify-between">
            <span>{selectedNode.label}</span>
            <button onClick={() => setSelectedNode(null)} className="text-white/40 hover:text-white">✕</button>
          </div>
          <p className="text-white/70 text-[11px] leading-relaxed">
            {selectedNode.summary || 'Core Web3 concept indexed in your Walrus decentralized memory.'}
          </p>
        </div>
      )}
    </div>
  );
};

// --- 4. Podcast Player with Speech Synthesis ---
export interface PodcastData {
  title?: string;
  outline?: string[];
  script?: Array<{ speaker: string; line: string }>;
}

export const PodcastPlayer: React.FC<{ data: PodcastData }> = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);

  const script = data.script || [];

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported on this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let lineIdx = currentLine;

    const speakNext = () => {
      if (lineIdx >= script.length) {
        setIsPlaying(false);
        setCurrentLine(0);
        return;
      }
      setCurrentLine(lineIdx);
      const item = script[lineIdx];
      const utter = new SpeechSynthesisUtterance(item.line);
      utter.rate = 1.0;
      utter.pitch = item.speaker.toLowerCase().includes('host') ? 1.1 : 0.9;
      utter.onend = () => {
        lineIdx++;
        speakNext();
      };
      utter.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
    };

    speakNext();
  };

  return (
    <div className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-white">🎙️ {data.title || 'Gaid3 Web3 Audio Episode'}</h4>
          <p className="text-[11px] text-white/50">2-Speaker Web3 Safe Guide · Walrus Memory</p>
        </div>
        <button
          onClick={handleSpeak}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EC612C] text-white text-xs font-semibold shadow hover:brightness-110 active:scale-95 transition-all"
        >
          <span>{isPlaying ? '⏸️ Pause' : '▶️ Listen to Episode'}</span>
        </button>
      </div>

      {/* Script Dialogue */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {script.map((turn, i) => {
          const isHost = turn.speaker.toLowerCase().includes('host');
          const isCurrent = isPlaying && currentLine === i;
          return (
            <div
              key={i}
              className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                isCurrent
                  ? 'bg-[#EC612C]/20 border-[#EC612C] text-white shadow-lg'
                  : isHost
                  ? 'bg-white/5 border-white/5 text-white/90'
                  : 'bg-black/30 border-white/10 text-white/80'
              }`}
            >
              <div className="font-semibold text-[11px] text-[#EC612C] mb-0.5">{turn.speaker}</div>
              <p>{turn.line}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- 5. Summary / Simplify Viewer ---
export interface SummaryData {
  summary?: string;
  keyPoints?: string[];
  takeaways?: string[];
  citations?: string[];
}

export const SummaryViewer: React.FC<{ data: SummaryData }> = ({ data }) => {
  return (
    <div className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 text-xs">
      {data.summary && (
        <div className="space-y-1">
          <h5 className="font-semibold text-white text-sm">Overview</h5>
          <p className="text-white/80 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
            {data.summary}
          </p>
        </div>
      )}

      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="font-semibold text-[#90EE90]">Key Points</h5>
          <ul className="space-y-1 pl-1">
            {data.keyPoints.map((pt, i) => (
              <li key={i} className="text-white/80 flex items-start gap-1.5">
                <span className="text-[#90EE90]">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.takeaways && data.takeaways.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="font-semibold text-amber-300">Actionable Takeaways</h5>
          <ul className="space-y-1 pl-1">
            {data.takeaways.map((tw, i) => (
              <li key={i} className="text-white/80 flex items-start gap-1.5">
                <span className="text-amber-300">✓</span>
                <span>{tw}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
