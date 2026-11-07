import { createServer } from 'node:http';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createEnquiryMailer } from './mail.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const purposes = new Set(['Multistorey residential building', 'New home or bungalow', 'Interior design', 'Planning & drafting', 'Renovation', '3D visualisation', 'Site coordination', 'Something else']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

export function createApp({ dataDir = join(root, 'data'), mailer = null } = {}) {
  const submissions = new Map();
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/enquiries') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(405, { error: 'Use POST to send an enquiry.' }); }
        if (req.headers.origin) {
          let origin;
          try { origin = new URL(req.headers.origin); } catch { return json(403, { error: 'Invalid request origin.' }); }
          if (origin.host !== req.headers.host) return json(403, { error: 'Please submit from this website.' });
        }
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Send a JSON request.' });
        const ip = req.socket.remoteAddress;
        const now = Date.now();
        for (const [key, value] of submissions) if (now - value.start > 600000) submissions.delete(key);
        const limit = submissions.get(ip) || { start: now, count: 0 };
        if (limit.count >= 20) { res.setHeader('Retry-After', '600'); return json(429, { error: 'Too many enquiries. Please try again in ten minutes.' }); }
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 8192) { json(413, { error: 'Your enquiry is too long.' }); return; }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(400, { error: 'Please send a valid enquiry.' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Please check your details.' });
        const { name, email, purpose, message = '', website = '' } = body;
        if (typeof name !== 'string' || name.trim().length < 2 || name.length > 80 ||
            typeof email !== 'string' || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ||
            !purposes.has(purpose) || typeof message !== 'string' || message.length > 2000 || website) {
          return json(400, { error: 'Please enter a name, valid email and a purpose. Keep your message under 2,000 characters.' });
        }
        const record = { id: `VPDS-${randomUUID().slice(0, 8).toUpperCase()}`, name: name.trim(), email: email.trim(), purpose, message: message.trim(), createdAt: new Date().toISOString() };
        try {
          await mkdir(dataDir, { recursive: true });
          await appendFile(join(dataDir, 'enquiries.jsonl'), JSON.stringify(record) + '\n', { mode: 0o600 });
        } catch { return json(503, { error: 'We could not save your enquiry. Please try again shortly.' }); }
        limit.count++;
        submissions.set(ip, limit);
        let emailStatus = 'not_configured';
        if (mailer) {
          try { await mailer.send(record); emailStatus = 'sent'; }
          catch { emailStatus = 'failed'; }
        }
        try {
          await appendFile(join(dataDir, 'email-events.jsonl'), JSON.stringify({ id: record.id, status: emailStatus, recordedAt: new Date().toISOString() }) + '\n', { mode: 0o600 });
        } catch { console.error(`Could not record notification status for ${record.id}.`); }
        return json(201, { id: record.id, emailStatus });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error: 'Method not allowed.' });
      const file = path === '/' ? 'index.html' : path.slice(1);
      if (!['index.html', 'styles.css', 'app.js'].includes(file) && !/^assets\/[a-zA-Z0-9_-]+\.(png|jpg|svg|woff2)$/.test(file)) {
        res.writeHead(404); return res.end('Not found');
      }
      let content;
      try { content = await readFile(join(root, file)); } catch { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { if (!res.headersSent) json(500, { error: 'Something went wrong. Please try again.' }); else res.end(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.loadEnvFile(join(root, '.env')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const port = Number(process.env.PORT || 3000);
  const mailer = createEnquiryMailer();
  if (!mailer) console.log('Email is not configured. Enquiries will be saved locally.');
  createApp({ mailer }).listen(port, '127.0.0.1', () => console.log(`VPDS studio: http://localhost:${port}`));
}
