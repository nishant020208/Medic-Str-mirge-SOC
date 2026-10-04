import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';

let server: http.Server;
let baseUrl: string;

async function poll(body: unknown, ip = '198.51.100.71') {
  return fetch(`${baseUrl}/api/terminal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Forwarded-For': ip,
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('POST /api/terminal (polling console, no WebSockets)', () => {
  it('1. Responds to whoami with the canned identity', async () => {
    const res = await poll({ cmd: 'whoami' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toContain('deploy (UID=1001');
  });

  it('2. pwd replays client history so cd stays consistent across polls', async () => {
    const first = await poll({ cmd: 'pwd', history: [] });
    expect((await first.json()).reply).toBe('/opt/asclepeion/temple');

    const second = await poll({ cmd: 'pwd', history: ['cd logs'] });
    expect((await second.json()).reply).toBe('/opt/asclepeion/temple/logs');

    const third = await poll({ cmd: 'pwd', history: ['cd logs', 'cd ..'] });
    expect((await third.json()).reply).toBe('/opt/asclepeion/temple');

    const absolute = await poll({ cmd: 'pwd', history: ['cd /var/log'] });
    expect((await absolute.json()).reply).toBe('/var/log');
  });

  it('3. Rejects commands longer than 200 characters with 400', async () => {
    const res = await poll({ cmd: 'a'.repeat(205) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at most 200/);
  });

  it('4. Rejects missing / empty / non-string cmd with 400', async () => {
    expect((await poll({})).status).toBe(400);
    expect((await poll({ cmd: '' })).status).toBe(400);
    expect((await poll({ cmd: 12345 })).status).toBe(400);
    expect((await poll({ cmd: '   ' })).status).toBe(400);
  });

  it('5. Unknown commands answer with command not found', async () => {
    const res = await poll({ cmd: 'rm -rf /' });
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe('command not found: rm');
  });

  it('6. cat /etc/passwd returns the canned file, other cats are refused', async () => {
    const passwd = await poll({ cmd: 'cat /etc/passwd' });
    expect((await passwd.json()).reply).toContain('deploy:x:1001:1001');

    const shadow = await poll({ cmd: 'cat /etc/shadow' });
    expect((await shadow.json()).reply).toContain('Permission denied');
  });

  it('7. id, uname, ls, cd and exit all answer with canned replies', async () => {
    expect((await (await poll({ cmd: 'id' })).json()).reply).toContain('uid=1001');
    expect((await (await poll({ cmd: 'uname' })).json()).reply).toContain('Asclepeion');
    expect((await (await poll({ cmd: 'ls' })).json()).reply).toContain('mirage/');
    expect((await (await poll({ cmd: 'exit' })).json()).reply).toContain('simulation');
    expect((await (await poll({ cmd: 'cd /tmp' })).json()).reply).toBe('');
  });

  it('8. Requires the CSRF header (same as every state-changing API route)', async () => {
    const res = await fetch(`${baseUrl}/api/terminal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'whoami' }),
    });
    expect(res.status).toBe(403);
  });
});
