import { Router, Request, Response } from 'express';
import { z } from 'zod';

/**
 * POST /api/terminal — polling replacement for the old WebSocket console.
 *
 * Stateless by design: the client sends its command history with each
 * request, so the fake filesystem (current directory) stays consistent
 * across invocations without keeping anything in function memory.
 */

export const terminalRouter = Router();

const terminalSchema = z.object({
  cmd: z
    .string()
    .min(1)
    .max(200)
    .refine((s) => s.trim().length > 0, { message: 'cmd must not be blank' }),
  history: z.array(z.string().max(200)).max(500).optional(),
});

const HOME = '/opt/asclepeion/temple';

const PASSWD_CANNED = [
  'root:x:0:0:root:/root:/bin/bash',
  'deploy:x:1001:1001:deploy:/opt/asclepeion/temple:/bin/bash',
  'mirage:x:9001:9001:MirageSOC Watcher:/nonexistent:/usr/sbin/nologin',
  'oracle:x:4242:4242:Pythia Oracle:/opt/pythia:/bin/false',
].join('\n');

/** Replay the client's history to reconstruct the fake current directory. */
export function resolveCwd(history: string[]): string {
  let cwd = HOME;
  for (const raw of history) {
    const parts = raw.trim().split(/\s+/);
    if (parts[0] !== 'cd') continue;
    const arg = parts[1] || '~';
    if (arg === '..') {
      cwd = cwd.split('/').slice(0, -1).join('/') || '/';
    } else if (arg.startsWith('/')) {
      cwd = arg.replace(/\/+$/, '') || '/';
    } else if (arg === '~') {
      cwd = HOME;
    } else {
      cwd = `${cwd}/${arg}`.replace(/\/+/g, '/');
    }
  }
  return cwd;
}

export function cannedReply(cmd: string, history: string[] = []): string {
  const trimmed = cmd.trim();
  const parts = trimmed.split(/\s+/);
  const bin = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  const cwd = resolveCwd(history);

  switch (bin) {
    case 'whoami':
      return 'deploy (UID=1001, GID=1001, Groups=asclepius-ops,mirage-audit)';
    case 'pwd':
      return cwd;
    case 'id':
      return 'uid=1001(deploy) gid=1001(deploy) groups=asclepius-ops,mirage-audit';
    case 'uname':
      return 'Asclepeion 4.2.0-hellenic-prod #1 SMP x86_64 GNU/Linux';
    case 'ls':
      return 'bin/  conf/  data/  logs/  mirage/  README.sanctum';
    case 'cat':
      if (args === '/etc/passwd') return PASSWD_CANNED;
      if (args.startsWith('/etc/')) return `cat: ${args}: Permission denied`;
      return `cat: ${args || 'missing operand'}: No such file or directory`;
    case 'cd':
      // Applies to the history-based cwd of subsequent commands — no output.
      return '';
    case 'exit':
      return 'Session terminated. (This console is a harmless simulation — connection persists.)';
    default:
      return `command not found: ${bin}`;
  }
}

terminalRouter.post('/', (req: Request, res: Response) => {
  const parsed = terminalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid terminal command: must be a non-empty string of at most 200 characters.',
    });
  }

  const { cmd, history = [] } = parsed.data;
  const reply = cannedReply(cmd, history);
  return res.status(200).json({ reply });
});
