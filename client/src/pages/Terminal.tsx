import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Wifi, WifiOff, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'warning';
  text: string;
}

/**
 * Hospital & Pharmacy Deception Terminal Honeypot.
 *
 * Simulates Ubuntu 22.04.4 LTS hospital operations gateway running HL7 integration
 * and HIPAA encrypted vault storage. Transparently logs adversary commands to MirageSOC.
 */
export const TerminalPage: React.FC = () => {
  const apiBase = import.meta.env.VITE_TERMINAL_API_URL || '/api/terminal';
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'Welcome to Ubuntu 22.04.4 LTS (GNU/Linux 6.5.0-28-generic x86_64)',
    },
    {
      id: 'init-2',
      type: 'system',
      text: ' * System: asclepius-medistore-prod (Hospital Internal Gateway)',
    },
    {
      id: 'init-3',
      type: 'warning',
      text: ' * HL7 Service: Active (Port 2575)',
    },
    {
      id: 'init-4',
      type: 'system',
      text: ' * Vault Status: HIPAA Encrypted Storage Mounted',
    },
    {
      id: 'init-5',
      type: 'warning',
      text: 'Notice: All activity on this medical network is monitored and logged.',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('connected');
  const [polling, setPolling] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pushLine = (type: TerminalLine['type'], text: string) => {
    setLines((prev) => [...prev, { id: Math.random().toString(), type, text }]);
  };

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Snapshot history before appending current command
    const pastHistory = [...history];

    // Add to input line
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type: 'input',
        text: `deploy@asclepius-medistore-prod:~$ ${trimmed}`,
      },
    ]);

    // Update history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputVal('');

    const firstWord = trimmed.toLowerCase().split(/\s+/)[0];

    // Local client-side clear command
    if (firstWord === 'clear') {
      setLines([]);
      return;
    }

    setPolling(true);
    fetch(apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ cmd: trimmed, history: pastHistory }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Command failed (HTTP ${res.status})`);
        }
        setConnectionStatus('connected');
        const replyText = data.reply ?? data.output;
        if (typeof replyText === 'string' && replyText.length > 0) {
          // Highlight warnings for HIPAA / canary indicators
          const isWarning =
            replyText.includes('HIPAA') ||
            replyText.includes('CANARY') ||
            replyText.includes('HL7') ||
            replyText.includes('Permission denied');
          pushLine(isWarning ? 'warning' : 'output', replyText);
        }
      })
      .catch((err: any) => {
        setConnectionStatus('disconnected');
        pushLine(
          'error',
          `bash: connection error to hospital gateway (${err?.message || 'offline'})`
        );
      })
      .finally(() => setPolling(false));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputVal(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        setHistoryIndex(nextIndex);
        setInputVal(history[nextIndex]);
      }
    }
  };

  return (
    <div
      className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-grow flex flex-col"
      style={{ colorScheme: 'dark' }}
    >
      <SEO
        title="Hospital Internal Gateway & Deception Shell | MediStore"
        description="Internal pharmaceutical and patient data gateway terminal."
        canonicalPath="/terminal"
        noindex={true}
      />
      <div className="mb-4">
        <Breadcrumbs items={[{ name: 'Hospital Gateway Shell', url: '/terminal' }]} />
      </div>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-5 h-5 text-[#34d399] shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>asclepius-medistore-prod</span>
            <span className="text-xs font-normal text-[#f59e0b] px-2 py-0.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/30">
              HIPAA SECURE
            </span>
          </h1>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <Badge
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border-[#34d399]/40 text-[#34d399] bg-[#34d399]/10"
            >
              <Wifi className="w-3 h-3 text-[#34d399]" />
              <span>HL7 Active (Port 2575)</span>
            </Badge>
          )}
          {connectionStatus === 'connecting' && (
            <Badge variant="primary" size="sm" className="flex items-center gap-1">
              <span>Connecting...</span>
            </Badge>
          )}
          {connectionStatus === 'disconnected' && (
            <Badge variant="danger" size="sm" className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              <span>Gateway Offline</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Clinical Dark Obsidian Terminal Screen (#0a0e17) */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-grow rounded-lg bg-[#0a0e17] text-slate-200 p-4 sm:p-6 font-mono text-xs sm:text-sm shadow-2xl border border-slate-800 overflow-hidden flex flex-col min-h-[440px] sm:min-h-[540px] cursor-text selection:bg-[#34d399]/30 selection:text-[#34d399]"
        style={{ colorScheme: 'dark' }}
      >
        {/* Terminal output area */}
        <div className="flex-grow overflow-y-auto space-y-1.5 pr-2 font-mono">
          {lines.map((line) => (
            <div
              key={line.id}
              className={`leading-relaxed whitespace-pre-wrap ${
                line.type === 'input'
                  ? 'text-white font-bold'
                  : line.type === 'system'
                  ? 'text-slate-400'
                  : line.type === 'warning'
                  ? 'text-[#f59e0b] font-medium'
                  : line.type === 'error'
                  ? 'text-rose-400 font-semibold'
                  : 'text-[#34d399]'
              }`}
            >
              {line.text}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Prompt line */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 mt-2">
          <span className="text-[#34d399] font-bold select-none whitespace-nowrap">
            deploy@asclepius-medistore-prod:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            maxLength={200}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={polling}
            className="flex-grow bg-transparent border-none outline-none text-[#34d399] font-mono text-xs sm:text-sm caret-[#34d399] min-h-[36px]"
            style={{ colorScheme: 'dark' }}
            autoFocus
            aria-label="Hospital Shell Command Input"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500 mt-3 font-mono">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#f59e0b]" />
          <span>Air-Gapped Deception Enclave · Activity Stream Monitored by MirageSOC</span>
        </span>
        <button
          onClick={() => setLines([])}
          className="text-slate-400 hover:text-[#34d399] transition-colors min-h-[36px] flex items-center"
        >
          Clear Screen
        </button>
      </div>
    </div>
  );
};
