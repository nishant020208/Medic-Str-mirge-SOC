import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  text: string;
}

export const TerminalPage: React.FC = () => {
  const wsUrl = import.meta.env.VITE_TERMINAL_WS_URL;
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
  >(wsUrl ? 'connecting' : 'offline');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!wsUrl) {
      setConnectionStatus('offline');
      setLines((prev) => [
        ...prev,
        {
          id: 'offline-warn',
          type: 'error',
          text: '[SYSTEM NOTICE] VITE_TERMINAL_WS_URL is unset. Console is currently offline. The oracle channel sleeps.',
        },
      ]);
      return;
    }

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      setConnectionStatus('connecting');

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          setLines((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              type: 'system',
              text: `[SECURE UPLINK ESTABLISHED] Connected to ${wsUrl}`,
            },
          ]);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.reply) {
              setLines((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: 'output',
                  text: data.reply,
                },
              ]);
            }
          } catch {
            setLines((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                type: 'output',
                text: event.data,
              },
            ]);
          }
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
          // Exponential backoff reconnect
          const backoff = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 15000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, backoff);
        };
      } catch (err) {
        setConnectionStatus('disconnected');
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsUrl]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

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

    // Built-in client commands
    if (trimmed.toLowerCase() === 'clear') {
      setLines([]);
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      setLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'output',
          text: `AVAILABLE SANCTUM COMMANDS:
  help      - Display this list of directives
  clear     - Wipe clean the bronze console
  status    - Interrogate oracle node health
  whoami    - Display current session authority
  version   - Inspect release build manifest
  exit      - Terminate console session`,
        },
      ]);
      return;
    }

    if (trimmed.toLowerCase() === 'status') {
      setLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'output',
          text: `STATUS: Node operational. Gateway: ${wsUrl || 'Local Mock'}. Uplink: ${connectionStatus}.`,
        },
      ]);
      return;
    }

    if (trimmed.toLowerCase() === 'whoami') {
      setLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'output',
          text: `deploy (UID=1001, GID=1001, Groups=asclepius-ops,mirage-audit)`,
        },
      ]);
      return;
    }

    if (trimmed.toLowerCase() === 'version') {
      setLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'output',
          text: `MediStore v1.0.0-asclepeion (Node 20, Vite 6, Strict TS, Mirage Hooked)`,
        },
      ]);
      return;
    }

    // If connected via WebSocket, send JSON command
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ cmd: trimmed }));
    } else {
      setLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'error',
          text: `bash: ${trimmed}: command routed, but remote daemon is unreachable. (Status: ${connectionStatus})`,
        },
      ]);
    }
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
            className="flex-grow bg-transparent border-none outline-none text-text font-mono text-sm caret-primary"
            autoFocus
            aria-label="Oracle Terminal Command Input"
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-text-muted mt-3 font-mono">
        <span>Type "help" for commands · Max length 200 chars</span>
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
