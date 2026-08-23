import React, { useState } from 'react';

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

interface Gaid3ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Gaid3ChatDrawer: React.FC<Gaid3ChatDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'safety' | 'guides'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'gaid3',
      text: "Hello! I'm **Gaid3** — your calm, patient Web3 guide powered by Walrus Memory. We'll take every step at your own pace with zero judgment. How can I help you explore Web3 safely today?",
      timestamp: 'Just now'
    }
  ]);
  const [facts, setFacts] = useState<Fact[]>([
    { category: 'experience', statement: 'User is exploring Web3 for the first time' },
    { category: 'chain', statement: 'Interested in Sui and Walrus Protocol' },
    { category: 'risk', statement: 'Low risk tolerance, prefers step-by-step confirmation' }
  ]);
  const [walrusBlobId, setWalrusBlobId] = useState<string>('walrus_testnet_8f9a2b1c4e');
  const [isSyncing, setIsSyncing] = useState(false);

  // Safety testing state
  const [safetyInput, setSafetyInput] = useState('');
  const [safetyResult, setSafetyResult] = useState<{
    riskScore: number;
    warnings: string[];
    recommendation: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    const newMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    // Simulate Gaid3 empathetic memory & safety processing
    setTimeout(() => {
      let replyText = '';
      const lower = userText.toLowerCase();
      let isSafety = false;

      // Seed phrase detector
      if (lower.includes('seed') || lower.includes('private key') || lower.includes('secret words')) {
        replyText =
          '⚠️ **Safety First Pause**: NEVER share your seed phrase or private keys with anyone or any AI assistant! Legitimate tools will never ask for them. Always keep your recovery phrase offline on paper.';
        isSafety = true;
      } else if (lower.includes('wallet') || lower.includes('setup')) {
        replyText =
          "Let's set up your Sui Wallet step by step:\n\n1. Install only from the official store (sui.io)\n2. Set a strong local password\n3. Write your 12 recovery words on paper\n\nWould you like me to guide you through backing up your recovery phrase safely?";
        setFacts((prev) => [...prev, { category: 'goal', statement: 'Setting up Sui Wallet' }]);
      } else if (lower.includes('walrus') || lower.includes('storage')) {
        replyText =
          'Walrus Protocol breaks your files and memories into decentralized slivers distributed across global nodes. Your learning profile with me is certified directly on the Walrus Testnet!';
      } else {
        replyText =
          "I hear you! I've noted that in your Walrus Memory profile. We'll take this one simple step at a time. What would you like to check next?";
        if (userText.length > 5) {
          setFacts((prev) => [...prev, { category: 'general', statement: userText }]);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'gaid3',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          safetyNotice: isSafety
        }
      ]);
    }, 600);
  };

  const handleSyncWalrus = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setWalrusBlobId(`walrus_certified_${Date.now().toString(36)}`);
      setIsSyncing(false);
    }, 1000);
  };

  const handleRunSafetyCheck = () => {
    const text = safetyInput.toLowerCase();
    if (text.includes('approve') || text.includes('unlimited')) {
      setSafetyResult({
        riskScore: 75,
        warnings: ['Unlimited token allowance requested by smart contract.'],
        recommendation: 'Only approve the exact amount needed for this single swap.'
      });
    } else if (text.includes('seed') || text.includes('key') || text.includes('word')) {
      setSafetyResult({
        riskScore: 100,
        warnings: ['CRITICAL: Potential seed phrase or private key disclosure!'],
        recommendation: 'Stop immediately. Never paste secret phrases into websites or chat boxes.'
      });
    } else {
      setSafetyResult({
        riskScore: 15,
        warnings: ['Standard transaction detected.'],
        recommendation: 'Check the recipient address and network fee before confirming in your wallet.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl h-[85vh] bg-[#111113] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EC612C] flex items-center justify-center font-bamboly text-xl font-bold text-white shadow-md">
              G3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base font-poppins">Gaid3 Assistant</h3>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#90EE90]/20 text-[#90EE90] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#90EE90] animate-pulse"></span>
                  Walrus Connected
                </span>
              </div>
              <p className="text-xs text-white/50">Decentralized Web3 Onboarding with Zero Fear</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-[#141416] text-xs font-medium">
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'chat' ? 'border-[#EC612C] text-white font-semibold' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            💬 Chat with Gaid3
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'memory' ? 'border-[#EC612C] text-white font-semibold' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            🧠 Walrus Memory ({facts.length})
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'safety' ? 'border-[#EC612C] text-white font-semibold' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            🛡️ Pre-Flight Safety Sandbox
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'guides' ? 'border-[#EC612C] text-white font-semibold' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            📋 Onboarding Guides
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#EC612C] text-white rounded-br-none'
                        : msg.safetyNotice
                        ? 'bg-red-950/80 border border-red-500/50 text-red-200 rounded-bl-none'
                        : 'bg-white/10 text-white/90 rounded-bl-none border border-white/5'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    <div className="text-[10px] text-white/40 mt-1 text-right">{msg.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: WALRUS MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/50">Walrus Storage Status</div>
                  <div className="text-sm font-mono text-[#90EE90] font-semibold mt-0.5">{walrusBlobId}</div>
                  <div className="text-xs text-white/40 mt-1">Decentralized storage certified on Sui Testnet</div>
                </div>
                <button
                  onClick={handleSyncWalrus}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-[#EC612C] hover:bg-[#ff723f] text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSyncing ? 'Certifying...' : '⚡ Sync to Walrus'}
                </button>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white/90 mb-3 font-poppins">Recalled Durable Facts</h4>
                <div className="space-y-2">
                  {facts.map((fact, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase font-mono text-[10px]">
                        {fact.category}
                      </span>
                      <span className="text-white/90 flex-1">{fact.statement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAFETY SANDBOX */}
          {activeTab === 'safety' && (
            <div className="space-y-5">
              <p className="text-xs text-white/60">
                Paste any transaction details, dApp message, or text below to simulate risk before signing in your wallet.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={safetyInput}
                  onChange={(e) => setSafetyInput(e.target.value)}
                  placeholder="e.g. Approve unlimited USDT spending or Claim free NFT airdrop"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#EC612C]"
                />
                <button
                  onClick={handleRunSafetyCheck}
                  className="px-4 py-2.5 bg-[#EC612C] hover:bg-[#ff723f] text-white rounded-lg text-xs font-semibold transition-all"
                >
                  Simulate
                </button>
              </div>

              {safetyResult && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Safety Score</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        safetyResult.riskScore > 50 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      Risk: {safetyResult.riskScore}/100
                    </span>
                  </div>
                  <div className="space-y-1">
                    {safetyResult.warnings.map((w, i) => (
                      <div key={i} className="text-xs text-yellow-300">
                        • {w}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-white/80 bg-white/5 p-2 rounded">
                    <strong>Recommendation:</strong> {safetyResult.recommendation}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GUIDES */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              <div className="border border-white/10 bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white font-poppins">Sui Wallet Safe Setup Checklist</h4>
                <p className="text-xs text-white/50 mb-3">5 verified steps to create your first wallet safely.</p>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-white/80">
                    <input type="checkbox" defaultChecked className="rounded border-white/20 accent-[#EC612C]" />
                    <span>Download only from verified Chrome Web Store / sui.io</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-white/80">
                    <input type="checkbox" defaultChecked className="rounded border-white/20 accent-[#EC612C]" />
                    <span>Set a strong local app password</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-white/80">
                    <input type="checkbox" className="rounded border-white/20 accent-[#EC612C]" />
                    <span>Write 12 recovery words on physical paper (NEVER screenshot)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-white/80">
                    <input type="checkbox" className="rounded border-white/20 accent-[#EC612C]" />
                    <span>Store physical backup in safe water/fireproof place</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar (Only on Chat tab) */}
        {activeTab === 'chat' && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#141416] flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about Web3, wallets, or Walrus..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#EC612C]"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-[#EC612C] hover:bg-[#ff723f] text-white font-medium rounded-xl text-xs transition-all shadow-lg font-poppins"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
