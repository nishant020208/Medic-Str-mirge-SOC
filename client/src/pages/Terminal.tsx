import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  text: string;
}

/**
 * Oracle Administrative Console — polling transport.
 *
 * No WebSockets anywhere: every typed line is a `POST` to the endpoint in
 * VITE_TERMINAL_API_URL (a MirageSOC backend, or the local stub at
 * /api/terminal). When that variable is empty the badge reads
 * "Console Offline" and only the local built-in commands work.
 * Command history lives client-side and is sent with each request so the
 * stateless server can keep the fake filesystem consistent.
 */
export const TerminalPage: React.FC = () => {
  const apiBase = import.meta.env.VITE_TERMINAL_API_URL;
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'MediStore Asclepeion Operating Core [Version 4.2.0-hellenic-prod]',
    },
    {
      id: 'init-2',
      type: 'system',
      text: '(c) 1250 BCE - 2026 CE Oracle Telecommunications. All rights reserved.',
    },
    {
      id: 'init-3',
      type: 'system',
      text: 'Type "help" for a list of available sanctum commands.',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'offline' | 'connecting'
  >(apiBase ? 'connecting' : 'offline');
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

  // Polling channel bootstrap (replaces the old WebSocket lifecycle)
  useEffect(() => {
    if (!apiBase) {
      setConnectionStatus('offline');
      pushLine(
        'error',
        '[SYSTEM NOTICE] VITE_TERMINAL_API_URL is unset. Console is currently offline. The oracle channel sleeps.'
      );
      return;
    }

    setConnectionStatus('connecting');
    pushLine('system', `[POLLING CHANNEL CONFIGURED] Endpoint: ${apiBase}`);
    // No persistent connection to establish — status flips to "connected"
    // on the first successful poll and back to "disconnected" on failure.
  }, [apiBase]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Snapshot history BEFORE the current command is appended — the server
    // replays it to reconstruct the fake current directory.
    const pastHistory = [...history];

    // Add to input line
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type: 'input',
        text: `deploy@medistore-prod:~$ ${trimmed}`,
      },
    ]);

    // Update history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputVal('');

    const firstWord = trimmed.toLowerCase().split(/\s+/)[0];

    // Built-in client commands
    if (firstWord === 'clear') {
      setLines([]);
      return;
    }

    if (firstWord === 'help') {
      pushLine(
        'output',
        `AVAILABLE SANCTUM COMMANDS:
  help      - Display this list of directives
  clear     - Wipe clean the bronze console
  status    - Interrogate oracle node health
  whoami    - Display current session authority
  version   - Inspect release build manifest
  exit      - Terminate console session`
      );
      return;
    }

    if (firstWord === 'status') {
      pushLine(
        'output',
        `STATUS: Node operational. Gateway: ${apiBase || 'unconfigured'}. Uplink: ${connectionStatus}.`
      );
      return;
    }

    if (firstWord === 'version') {
      pushLine(
        'output',
        'MediStore v1.0.0-asclepeion (Node 20, Vite 6, Strict TS, Mirage Hooked)'
      );
      return;
    }

    // Everything else is polled over HTTP (POST /api/terminal or the
    // MirageSOC backend configured via VITE_TERMINAL_API_URL).
    if (!apiBase) {
      pushLine(
        'error',
        `bash: ${trimmed}: command routed, but remote daemon is unreachable. (Status: offline)`
      );
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
          throw new Error(data.error || `poll failed (HTTP ${res.status})`);
        }
        setConnectionStatus('connected');
        if (typeof data.reply === 'string' && data.reply.length > 0) {
          pushLine('output', data.reply);
        }
      })
      .catch((err: any) => {
        setConnectionStatus('disconnected');
        pushLine(
          'error',
          `poll failed: ${err?.message || 'network error'} — ${trimmed} was not executed.`
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow flex flex-col">
      <SEO
        title="Oracle Administrative Console | MediStore Sanctuary"
        description="Restricted sanctuary terminal and diagnostics interface."
        canonicalPath="/terminal"
        noindex={true}
      />
      <div className="mb-4">
        <Breadcrumbs items={[{ name: 'Oracle Console', url: '/terminal' }]} />
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-5 h-5 text-accent-text" />
          <h1 className="font-cinzel text-lg font-bold text-text">
            Oracle Administrative Console
          </h1>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <Badge variant="success" size="sm" className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <span>Connected</span>
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
              <span>Disconnected</span>
            </Badge>
          )}
          {connectionStatus === 'offline' && (
            <Badge variant="outline" size="sm" className="flex items-center gap-1 text-text-muted">
              <AlertTriangle className="w-3 h-3 text-accent-text" />
              <span>Console Offline</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Retro Bronze Terminal Screen */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-grow rounded-card bg-surface-2 text-text p-5 font-mono text-sm shadow-theme border-2 border-border overflow-hidden flex flex-col min-h-[500px] cursor-text selection:bg-accent selection:text-text-on-primary"
      >
        {/* Terminal output area */}
        <div className="flex-grow overflow-y-auto space-y-1.5 pr-2">
          {lines.map((line) => (
            <div
              key={line.id}
              className={`leading-relaxed whitespace-pre-wrap ${
                line.type === 'input'
                  ? 'text-text font-bold'
                  : line.type === 'system'
                  ? 'text-text-muted'
                  : line.type === 'error'
                  ? 'text-danger font-semibold'
                  : 'text-accent-text'
              }`}
            >
              {line.text}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Prompt line */}
        <div className="flex items-center gap-2 pt-3 border-t border-border mt-2">
          <span className="text-accent-text font-bold select-none whitespace-nowrap">
            deploy@medistore-prod:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            maxLength={200}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={polling}
            className="flex-grow bg-transparent border-none outline-none text-text font-mono text-sm caret-primary"
            autoFocus
            aria-label="Oracle Terminal Command Input"
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-text-muted mt-3 font-mono">
        <span>Type "help" for commands · Max length 200 chars · HTTP polling (no sockets)</span>
        <button
          onClick={() => setLines([])}
          className="text-accent-text hover:underline"
        >
          Clear Screen
        </button>
      </div>
    </div>
  );
};
