import { Router, Request, Response } from 'express';
import { z } from 'zod';
// @ts-ignore - mirage.js is a plain JS module
import mirage from '../../mirage.js';

/**
 * POST /api/terminal — Hospital & Pharmacy Deception Terminal Honeypot.
 *
 * Air-gapped simulated hospital environment containing sensitive patient
 * data, pharmacy inventory, and HL7 gateway configuration.
 * Zero command execution on the host system: 100% deterministic in-memory lookup.
 * Transparently reports command execution and honeytoken triggers to MirageSOC.
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

const HOME = '/home/deploy';

const PASSWD_CANNED = [
  'root:x:0:0:root:/root:/bin/bash',
  'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
  'bin:x:2:2:bin:/bin:/usr/sbin/nologin',
  'sys:x:3:3:sys:/dev:/usr/sbin/nologin',
  'sync:x:4:65534:sync:/bin:/bin/sync',
  'games:x:5:60:games:/usr/games:/usr/sbin/nologin',
  'man:x:6:12:man:/var/cache/man:/usr/sbin/nologin',
  'lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin',
  'mail:x:8:8:mail:/var/mail:/usr/sbin/nologin',
  'news:x:9:9:news:/var/spool/news:/usr/sbin/nologin',
  'uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin',
  'proxy:x:13:13:proxy:/bin:/usr/sbin/nologin',
  'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
  'backup:x:34:34:backup:/var/backups:/usr/sbin/nologin',
  'list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin',
  'irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin',
  'gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin',
  'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
  '_apt:x:100:65534::/nonexistent:/usr/sbin/nologin',
  'systemd-network:x:101:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin',
  'systemd-resolve:x:102:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin',
  'messagebus:x:103:104::/nonexistent:/usr/sbin/nologin',
  'systemd-timesync:x:104:105:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin',
  'sshd:x:105:65534::/run/sshd:/usr/sbin/nologin',
  'postgres:x:106:110:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash',
  'deploy:x:1000:1000:deploy,,,:/home/deploy:/bin/bash',
].join('\n');

const PATIENT_RECORDS_ENC = [
  '-----BEGIN HIPAA ENCRYPTED PATIENT RECORD-----',
  'MIICXAIBAAKCAQEA0mZ59x7vQ1p3kL9m8N2xY7qR4wK1jE5tP8sL3vX9zY2aB4cD',
  'eF6gH8jK1mN3pQ5sT7uV9wX1yZ3bA5cD7eF9gH1jK3mN5pQ7sT9uV1wX3yZ5bA7cD',
  'D9eF1gH3jK5mN7pQ9sT1uV3wX5yZ7bA9cD1eF3gH5jK7mN9pQ1sT3uV5wX7yZ9bA',
  '1cD3eF5gH7jK9mN1pQ3sT5uV7wX9yZ1bA3cD5eF7gH9jK1mN3pQ5sT7uV9wX1yZ3',
  'bA5cD7eF9gH1jK3mN5pQ7sT9uV1wX3yZ5bA7cD9eF1gH3jK5mN7pQ9sT1uV3wX5y',
  'Z7bA9cD1eF3gH5jK7mN9pQ1sT3uV5wX7yZ9bA1cD3eF5gH7jK9mN1pQ3sT5uV7wX',
  '9yZ1bA3cD5eF7gH9jK1mN3pQ5sT7uV9wX1yZ3bA5cD7eF9gH1jK3mN5pQ7sT9uV1',
  'wX3yZ5bA7cD9eF1gH3jK5mN7pQ9sT1uV3wX5yZ7bA9cD1eF3gH5jK7mN9pQ1sT3u',
  'V5wX7yZ9bA1cD3eF5gH7jK9mN1pQ3sT5uV7wX9yZ1bA3cD5eF7gH9jK1mN3pQ5sT',
  '7uV9wX1yZ3bA5cD7eF9gH1jK3mN5pQ7sT9uV1wX3yZ5bA7cD9eF1gH3jK5mN7pQ9',
  'sT1uV3wX5yZ7bA9cD1eF3gH5jK7mN9pQ1sT3uV5wX7yZ9bA1cD3eF5gH7jK9mN1p',
  'Q3sT5uV7wX9yZ1bA3cD5eF7gH9jK1mN3pQ5sT7uV9wX1yZ3bA5cD7eF9gH1jK3mN',
  '5pQ7sT9uV1wX3yZ5bA7cD9eF1gH3jK5mN7pQ9sT1uV3wX5yZ7bA9cD1eF3gH5jK7',
  'mN9pQ1sT3uV5wX7yZ9bA1cD3eF5gH7jK9mN1pQ3sT5uV7wX9yZ1bA3cD5eF7gH9j',
  'K1mN3pQ5sT7uV9wX1yZ3bA5cD7eF9gH1jK3mN5pQ7sT9uV1wX3yZ5bA7cD9eF1gH',
  '3jK5mN7pQ9sT1uV3wX5yZ7bA9cD1eF3gH5jK7mN9pQ1sT3uV5wX7yZ9bA1cD3eF5',
  'gH7jK9mN1pQ3sT5uV7wX9yZ1bA3cD5eF7gH9jK1mN3pQ5sT7uV9wX1yZ3bA5cD7e',
  'F9gH1jK3mN5pQ7sT9uV1wX3yZ5bA7cD9eF1gH3jK5mN7pQ9sT1uV3wX5yZ7bA9cD',
  '1eF3gH5jK7mN9pQ1sT3uV5wX7yZ9bA1cD3eF5gH7jK9mN1pQ3sT5uV7wX9yZ1bA3',
  'cD5eF7gH9jK1mN3pQ5sT7uV9wX1yZ3bA5cD7eF9gH1jK3mN5pQ7sT9uV1wX3yZ5b',
  'A7cD9eF1gH3jK5mN7pQ9sT1uV3wX5yZ7bA9cD1eF3gH5jK7mN9pQ1sT3uV5wX7yZ',
  '9bA1cD3eF5gH7jK9mN1pQ3sT5uV7wX9yZ1bA3cD5eF7gH9jK1mN3pQ5sT7uV9wX1',
  'yZ3bA5cD7eF9gH1jK3mN5pQ7sT9uV1wX3yZ5bA7cD9eF1gH3jK5mN7pQ9sT1uV3w',
  'X5yZ7bA9cD1eF3gH5jK7mN9pQ1sT3uV5wX7yZ9bA1cD3eF5gH7jK9mN1pQ3sT5uV',
  'HASH: SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  '-----END HIPAA ENCRYPTED PATIENT RECORD-----',
].join('\n');

const HL7_CREDENTIALS_CANNED = [
  'HL7_ROUTER_HOST=internal-hl7.hospital.local',
  'HL7_PORT=2575',
  'VAULT_CANARY_TOKEN=AKIA_CANARY_MEDISTORE_92318',
  'DB_REPLICA=postgres://hl7_ro:P@ssw0rd2024!@10.0.4.12:5432/medistore',
].join('\n');

const STAFF_ROSTER_CANNED = [
  'id,name,role,department,clearance,pager',
  'EMP-1042,Dr. Althea Vance,Chief Medical Officer,Emergency Medicine,Level-4,555-0192',
  'EMP-1088,Markus Sterling,Lead Pharmacist,Dispensary & Controlled Substances,Level-3,555-0144',
  'EMP-1102,Elena Rostova,Surgical Specialist,Operating Theatre 2,Level-3,555-0188',
  'EMP-1145,David Chen,HL7 Integration Engineer,Hospital Systems,Level-3,555-0121',
  'EMP-1199,Sarah Jenkins,Nurse Supervisor,Intensive Care Unit,Level-2,555-0110',
].join('\n');

const ENV_BACKUP_CANNED = [
  'NODE_ENV=production',
  'PORT=5000',
  'APP_NAME=asclepius-hospital-gateway',
  'DATABASE_URL=postgres://hl7_ro:P@ssw0rd2024!@10.0.4.12:5432/medistore',
  'HL7_ROUTER_HOST=internal-hl7.hospital.local',
  'HL7_PORT=2575',
  'VAULT_CANARY_TOKEN=AKIA_CANARY_MEDISTORE_92318',
  'HIPAA_STORAGE_PATH=/mnt/hipaa_vault/records',
].join('\n');

const BACKUP_DATABASE_CANNED = [
  '-- PostgreSQL database dump: medistore_hospital_prod (v15.4)',
  '-- Consecrated hospital patient & pharmacy store',
  'SET statement_timeout = 0;',
  'SET lock_timeout = 0;',
  'CREATE TABLE public.dispensary_vault (',
  '    id character varying(64) PRIMARY KEY,',
  '    ndc_code character varying(32) NOT NULL,',
  '    substance_name text NOT NULL,',
  '    dea_schedule character varying(8) NOT NULL,',
  '    vault_storage_units integer NOT NULL',
  ');',
  "INSERT INTO public.dispensary_vault VALUES ('MED-881','0002-3227-30','Hydromorphone 2mg/mL','C-II',420);",
  "INSERT INTO public.dispensary_vault VALUES ('MED-882','0054-0176-25','Morphine Sulfate 15mg','C-II',850);",
  "INSERT INTO public.dispensary_vault VALUES ('MED-883','0074-3331-13','Fentanyl Citrate 50mcg/mL','C-II',310);",
].join('\n');

const PHARMACY_SQLITE_CANNED =
  '[Binary SQLite 3 database file: 48 tables, 14,280 pharmaceutical inventory SKU records]';

const CANARY_TRIGGERS = [
  'hl7_gateway_credentials.conf',
  '.env.production.backup',
  'AKIA_CANARY_MEDISTORE_92318',
  'VAULT_CANARY_TOKEN',
  'patient_records_2024_q3.enc',
];

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
  const args = parts.slice(1).join(' ').trim();
  const cwd = resolveCwd(history);

  switch (bin) {
    case 'whoami':
      return 'deploy';
    case 'pwd':
      return cwd;
    case 'id':
      return 'uid=1000(deploy) gid=1000(deploy) groups=1000(deploy),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),110(lxd)';
    case 'uname':
      if (args === '-r') return '6.5.0-28-generic';
      return 'Linux asclepius-medistore-prod 6.5.0-28-generic #29~22.04.1-Ubuntu SMP x86_64';
    case 'ls':
    case 'dir': {
      if (
        args.includes('-la') ||
        args.includes('-al') ||
        (args.includes('-l') && args.includes('-a')) ||
        bin === 'dir'
      ) {
        return [
          'total 15188',
          'drwxr-xr-x 2 deploy deploy     4096 Oct 30 14:15 .',
          'drwxr-xr-x 3 root   root       4096 Oct 15 09:22 ..',
          '-rw------- 1 deploy deploy     1842 Oct 30 14:12 .bash_history',
          '-rw-r--r-- 1 deploy deploy     3771 Jan  6  2024 .bashrc',
          '-rw-r----- 1 deploy deploy      512 Oct 28 11:04 .env.production.backup',
          '-rw-r--r-- 1 deploy deploy      807 Jan  6  2024 .profile',
          '-rw-r----- 1 deploy deploy  8421376 Oct 29 03:00 backup_database.dump',
          '-rw-r----- 1 deploy deploy      248 Oct 25 18:32 hl7_gateway_credentials.conf',
          '-rw-r----- 1 deploy deploy    24576 Oct 28 09:15 patient_records_2024_q3.enc',
          '-rw-r--r-- 1 deploy deploy  6717440 Oct 30 08:00 pharmacy_inventory.sqlite',
          '-rw-r----- 1 deploy deploy      486 Oct 27 16:40 staff_roster_confidential.csv',
        ].join('\n');
      }
      if (args.includes('-a')) {
        return '.  ..  .bash_history  .bashrc  .env.production.backup  .profile  backup_database.dump  hl7_gateway_credentials.conf  patient_records_2024_q3.enc  pharmacy_inventory.sqlite  staff_roster_confidential.csv';
      }
      return 'backup_database.dump  hl7_gateway_credentials.conf  patient_records_2024_q3.enc  pharmacy_inventory.sqlite  staff_roster_confidential.csv';
    }
    case 'cat':
    case 'head':
    case 'tail':
    case 'more':
    case 'less': {
      const target = args.replace(/^[./]+/, '').trim();
      if (target === 'patient_records_2024_q3.enc' || args.includes('patient_records')) {
        return PATIENT_RECORDS_ENC;
      }
      if (target === 'hl7_gateway_credentials.conf' || args.includes('hl7_gateway')) {
        return HL7_CREDENTIALS_CANNED;
      }
      if (target === 'staff_roster_confidential.csv' || args.includes('staff_roster')) {
        return STAFF_ROSTER_CANNED;
      }
      if (
        target === '.env.production.backup' ||
        target === '.env' ||
        args.includes('.env')
      ) {
        return ENV_BACKUP_CANNED;
      }
      if (
        target === 'pharmacy_inventory.sqlite' ||
        args.includes('pharmacy_inventory')
      ) {
        return PHARMACY_SQLITE_CANNED;
      }
      if (target === 'backup_database.dump' || args.includes('backup_database')) {
        return BACKUP_DATABASE_CANNED;
      }
      if (args === '/etc/passwd' || target === 'etc/passwd') {
        return PASSWD_CANNED;
      }
      if (args.startsWith('/etc/')) {
        return `cat: ${args}: Permission denied`;
      }
      return `cat: ${args || 'missing operand'}: No such file or directory`;
    }
    case 'cd':
      return '';
    case 'exit':
      return 'logout';
    case 'clear':
      return '';
    case 'help':
      return [
        'GNU bash, version 5.1.16(1)-release (x86_64-pc-linux-gnu)',
        'These shell commands are defined internally. Type `help\' to see this list.',
        '',
        'Apothecary & Hospital Operations Gateway Console.',
        'Available commands: ls, dir, cat, head, tail, pwd, whoami, id, uname, cd, clear, help, exit.',
        'Storage: /mnt/hipaa_vault, /home/deploy',
      ].join('\n');
    default:
      return `${bin}: command not found`;
  }
}

terminalRouter.post('/', async (req: Request, res: Response) => {
  const parsed = terminalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid terminal command: must be a non-empty string of at most 200 characters.',
    });
  }

  const { cmd, history = [] } = parsed.data;
  const reply = cannedReply(cmd, history);

  // Telemetry integration with MirageSOC
  const ip =
    typeof mirage.getClientIp === 'function' ? mirage.getClientIp(req) : (req.ip || '');
  const userAgent = req.headers['user-agent'] || '';

  const isCanary = CANARY_TRIGGERS.some((t) =>
    cmd.toLowerCase().includes(t.toLowerCase())
  );
  const kind = isCanary ? 'honeytoken' : 'terminal_cmd';
  const severity = isCanary ? 'critical' : 'high';

  const detail: Record<string, any> = {
    cmd,
    honeypot: 'asclepius_hospital_shell',
    source: 'medistore_terminal',
  };
  if (isCanary) {
    detail.reason = 'canary_hospital_artifact_accessed';
    detail.token = 'AKIA_CANARY_MEDISTORE_92318';
  }

  if (typeof mirage.sendEvent === 'function') {
    try {
      await mirage.sendEvent({
        ip,
        userAgent,
        path: '/terminal',
        method: 'POST',
        kind,
        severity,
        detail,
      });
    } catch {
      // Fail open safely
    }
  }

  return res.status(200).json({ reply, output: reply });
});
