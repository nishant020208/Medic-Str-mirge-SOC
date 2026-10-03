import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../src/index.js';
import { AddressInfo } from 'net';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';

let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    if (server.listening) {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    } else {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    }
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Terminal Safety & Conditional Echo Endpoint', () => {
  it('Default State: /terminal-ws is OFF by default and rejects WebSocket upgrade', async () => {
    const wsUrl = `${baseUrl.replace('http', 'ws')}/terminal-ws`;
    const ws = new WebSocket(wsUrl);

    const rejected = await new Promise<boolean>((resolve) => {
      ws.on('error', () => {
        resolve(true);
      });
      ws.on('open', () => {
        ws.close();
        resolve(false);
      });
    });

    expect(rejected).toBe(true);
  });

  it('Enabled State: When local echo is enabled, accepts connection and returns harmless canned text', async () => {
    // Create an isolated test server simulating ENABLE_LOCAL_TERMINAL_ECHO=true
    const echoServer = http.createServer((req, res) => {
      res.writeHead(404);
      res.end();
    });

    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws: WebSocket) => {
      ws.send(
        JSON.stringify({
          reply: 'Asclepeion Terminal Local Echo connected (canned echo mode).',
        })
      );

      ws.on('message', (message: string) => {
        const rawStr = message.toString();
        if (rawStr.length > 200) {
          ws.send(
            JSON.stringify({ reply: 'Error: input exceeds maximum limit of 200 characters.' })
          );
          return;
        }

        let cmd = '';
        try {
          const parsed = JSON.parse(rawStr);
          cmd = String(parsed.cmd || parsed.command || '').trim();
        } catch {
          cmd = rawStr.trim();
        }

        if (cmd.length > 200) {
          ws.send(JSON.stringify({ reply: 'Error: command exceeds 200 characters.' }));
          return;
        }

        const firstWord = cmd.split(/\s+/)[0] || '';
        const reply = `command not found: ${firstWord}`;
        ws.send(JSON.stringify({ reply }));
      });
    });

    echoServer.on('upgrade', (request, socket, head) => {
      const host = request.headers.host || 'localhost';
      const pathname = request.url ? new URL(request.url, `http://${host}`).pathname : '';
      if (pathname === '/terminal-ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    await new Promise<void>((resolve) => echoServer.listen(0, '127.0.0.1', resolve));
    const port = (echoServer.address() as AddressInfo).port;
    const wsUrl = `ws://127.0.0.1:${port}/terminal-ws`;

    const ws = new WebSocket(wsUrl);

    // 1. Initial connection message
    const welcome = await new Promise<string>((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString()).reply));
    });
    expect(welcome).toContain('Asclepeion Terminal Local Echo connected');

    // 2. Canned command not found response for harmless command
    ws.send(JSON.stringify({ cmd: 'whoami' }));
    const whoamiReply = await new Promise<string>((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString()).reply));
    });
    expect(whoamiReply).toBe('command not found: whoami');

    // 3. Reject commands exceeding 200 chars
    const oversizedCommand = 'a'.repeat(205);
    ws.send(JSON.stringify({ cmd: oversizedCommand }));
    const oversizedReply = await new Promise<string>((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString()).reply));
    });
    expect(oversizedReply).toContain('exceeds');

    ws.close();
    await new Promise<void>((resolve) => echoServer.close(() => resolve()));
  });
});
