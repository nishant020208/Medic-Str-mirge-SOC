import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, HelpCircle } from 'lucide-react';
import oracleQA from '../data/oracleKnowledge.json';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GreekDivider } from '../ui/GreekDivider';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface ChatMessage {
  id: string;
  sender: 'oracle' | 'user';
  text: string;
  timestamp: string;
  source?: 'ai' | 'scripted';
}

export const OraclePage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'oracle',
      text: 'Hail, seeker of Epidaurus. I am the digital Pythia of MediStore. Enquire on herbal remedies, batch provenance, shipping, or temple rites.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'scripted',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const suggestionChips = [
    'How do I verify a medicine batch on chain?',
    'What remedies soothe winter coughs?',
    'How does Hermes courier deliver?',
    'What rare botanical herbs are kept here?',
    'What is the true nature of this sanctuary?',
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const matchAnswer = (userQuery: string): string => {
    const qLower = userQuery.toLowerCase();

    // Check keyword score
    let bestMatch: (typeof oracleQA)[0] | null = null;
    let highestScore = 0;

    for (const item of oracleQA) {
      let score = 0;
      for (const kw of item.keywords) {
        if (qLower.includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && highestScore > 0) {
      return bestMatch.answer;
    }

    return 'The Omens are clouded regarding this inquiry. The Oracle suggests consulting our Apothecary Dispensary catalog or enlisting the Chief Pharmacist at /dashboard.';
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/oracle/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ message: query }),
      });

      const contentType = res.headers.get('content-type') || '';
      let reply = '';
      let source: 'ai' | 'scripted' = 'scripted';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        reply = data.reply;
        if (data.source === 'ai' || data.source === 'scripted') {
          source = data.source;
        }
      }

      if (!reply) {
        reply = matchAnswer(query);
        source = 'scripted';
      }

      const oracleMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'oracle',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source,
      };
      setMessages((prev) => [...prev, oracleMsg]);
    } catch (err) {
      const fallback = matchAnswer(query);
      const oracleMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'oracle',
        text: fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'scripted',
      };
      setMessages((prev) => [...prev, oracleMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-grow flex flex-col">
      <SEO
        title="Oracle of Asclepius | Digital Healing Knowledge Base"
        description="Enquire on herbal remedies, pharmaceutical batch provenance, ancient ingredients, and temple dispensary rites."
        canonicalPath="/oracle"
      />
      <div className="mb-4">
        <Breadcrumbs items={[{ name: 'Oracle of Asclepius', url: '/oracle' }]} />
      </div>

      {/* Oracle Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-2 border-2 border-border text-accent-text flex items-center justify-center mx-auto mb-3 shadow-theme">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
          The Delphic Digital Hearth
        </span>
        <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-text">
          The Oracle of Asclepius
        </h1>
        <p className="font-cormorant text-sm sm:text-base text-text-muted max-w-lg mx-auto mt-1">
          Pose your questions to the ancient consecrated intelligence. Scripted answers synthesized from the sacred codex.
        </p>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        <span className="text-xs font-cinzel text-text-muted shrink-0 flex items-center gap-1 font-bold">
          <HelpCircle className="w-3.5 h-3.5 text-accent-text" /> Prompts:
        </span>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(chip)}
            className="px-3 py-1.5 text-xs font-cinzel rounded-full bg-surface-2 border border-border hover:border-accent text-text transition-colors whitespace-nowrap min-h-[36px]"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <Card
        variant="papyrus"
        className="flex-grow flex flex-col p-3.5 sm:p-6 min-h-[420px] sm:min-h-[480px] max-h-[620px] border-2 border-border shadow-theme"
      >
        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-border ${
                  m.sender === 'oracle'
                    ? 'bg-surface-2 text-accent-text'
                    : 'bg-primary text-text-on-primary font-bold'
                }`}
              >
                {m.sender === 'oracle' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[80%] rounded-card p-3.5 text-sm ${
                  m.sender === 'oracle'
                    ? 'bg-surface text-text border border-border'
                    : 'bg-primary text-text-on-primary font-medium'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75 font-cinzel">
                  <span className="flex items-center gap-1.5">
                    {m.sender === 'oracle' ? 'Pythia Oracle' : 'Devotee'}
                    {m.sender === 'oracle' && m.source && (
                      <Badge variant={m.source === 'ai' ? 'gold' : 'info'} size="sm">
                        {m.source === 'ai' ? 'AI' : 'Scripted'}
                      </Badge>
                    )}
                  </span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="font-cormorant text-base leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-2 border border-border text-accent-text flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 bg-surface rounded-card border border-border text-xs font-cinzel text-accent-text flex items-center gap-2">
                <span>The Oracle divines the stars...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <GreekDivider className="my-3" symbol={false} />

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Inquire of remedies, batches, shipping..."
            className="flex-grow min-h-[44px] px-3 sm:px-4 py-2 text-sm bg-surface-2 border border-border rounded-card text-text focus:outline-none focus:ring-2 focus:ring-ring font-sans"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputVal.trim() || isTyping}
            rightIcon={<Send className="w-4 h-4" />}
            className="shrink-0"
          >
            Inquire
          </Button>
        </form>
      </Card>

      {/* Mandatory Disclaimer */}
      <div className="text-center text-xs text-text-muted mt-4">
        Licensed Apothecary &amp; Dispensary. Consecrated by the Asclepeion.
      </div>
    </div>
  );
};
