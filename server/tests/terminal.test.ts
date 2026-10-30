import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';
// @ts-ignore - mirage.js is a plain JS module
import mirage from '../mirage.js';

let server: http.Server;
let baseUrl: string;

function randomTestIp() {
  return `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
}

async function poll(body: unknown, ip?: string) {
  const clientIp = ip || randomTestIp();
  return fetch(`${baseUrl}/api/terminal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Forwarded-For': clientIp,
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

describe('POST /api/terminal (Hospital & Pharmacy Deception Honeypot)', () => {
  it('1. Responds to whoami with the deploy identity', async () => {
    const res = await poll({ cmd: 'whoami' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('deploy');
    expect(body.output).toBe('deploy');
  });

  it('2. pwd replays client history starting from /home/deploy', async () => {
    const first = await poll({ cmd: 'pwd', history: [] });
    expect((await first.json()).reply).toBe('/home/deploy');

    const second = await poll({ cmd: 'pwd', history: ['cd logs'] });
    expect((await second.json()).reply).toBe('/home/deploy/logs');

    const third = await poll({ cmd: 'pwd', history: ['cd logs', 'cd ..'] });
    expect((await third.json()).reply).toBe('/home/deploy');

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

  it('5. Unknown commands answer with bash command not found', async () => {
    const res = await poll({ cmd: 'rm -rf /' });
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe('rm: command not found');
  });

  it('6. cat /etc/passwd returns decoy linux passwd with deploy and postgres', async () => {
    const passwd = await poll({ cmd: 'cat /etc/passwd' });
    const reply = (await passwd.json()).reply;
    expect(reply).toContain('deploy:x:1000:1000');
    expect(reply).toContain('postgres:x:106:110');
    expect(reply).toContain('www-data:x:33:33');

    const shadow = await poll({ cmd: 'cat /etc/shadow' });
    expect((await shadow.json()).reply).toContain('Permission denied');
  });

  it('7. id, uname, ls, dir and exit answer with realistic hospital system replies', async () => {
    expect((await (await poll({ cmd: 'id' })).json()).reply).toContain('uid=1000(deploy)');
    expect((await (await poll({ cmd: 'uname -a' })).json()).reply).toContain(
      'asclepius-medistore-prod 6.5.0-28-generic'
    );
    expect((await (await poll({ cmd: 'ls' })).json()).reply).toContain(
      'patient_records_2024_q3.enc'
    );
    expect((await (await poll({ cmd: 'ls -la' })).json()).reply).toContain(
      'hl7_gateway_credentials.conf'
    );
    expect((await (await poll({ cmd: 'exit' })).json()).reply).toBe('logout');
  });

  it('8. Accessing sensitive hospital decoy files yields expected decoy content', async () => {
    const patientRes = await poll({ cmd: 'cat patient_records_2024_q3.enc' });
    expect(patientRes.status).toBe(200);
    const patientBody = (await patientRes.json()).reply;
    expect(patientBody).toContain('-----BEGIN HIPAA ENCRYPTED PATIENT RECORD-----');
    expect(patientBody).toContain('SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');

    const hl7Res = await poll({ cmd: 'cat hl7_gateway_credentials.conf' });
    expect(hl7Res.status).toBe(200);
    const hl7Body = (await hl7Res.json()).reply;
    expect(hl7Body).toContain('HL7_ROUTER_HOST=internal-hl7.hospital.local');
    expect(hl7Body).toContain('AKIA_CANARY_MEDISTORE_92318');

    const rosterRes = await poll({ cmd: 'cat staff_roster_confidential.csv' });
    expect(rosterRes.status).toBe(200);
    expect((await rosterRes.json()).reply).toContain('Dr. Althea Vance');

    const dumpRes = await poll({ cmd: 'cat backup_database.dump' });
    expect(dumpRes.status).toBe(200);
    expect((await dumpRes.json()).reply).toContain('Hydromorphone 2mg/mL');
  });

  it('9. Dispatches honeytoken telemetry to MirageSOC when canary file is queried', async () => {
    const sendEventSpy = vi.spyOn(mirage, 'sendEvent');
    try {
      const res = await poll({ cmd: 'cat hl7_gateway_credentials.conf' });
      expect(res.status).toBe(200);
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'honeytoken',
          severity: 'critical',
          path: '/terminal',
          method: 'POST',
        })
      );
    } finally {
      sendEventSpy.mockRestore();
    }
  });

  it('10. Requires the CSRF header (same as every state-changing API route)', async () => {
    const res = await fetch(`${baseUrl}/api/terminal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'whoami' }),
    });
    expect(res.status).toBe(403);
  });
});
