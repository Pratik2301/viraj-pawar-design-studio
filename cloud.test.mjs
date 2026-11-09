import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequestHandler } from './server.mjs';
import nodemailer from 'nodemailer';
import { createEnquiryMailer } from './mail.mjs';

const origin = 'https://pratik2301.github.io';
test('custom domain and Pages origins are allowed while lookalike domains are rejected', async () => {
  const app = createServer(createRequestHandler({ allowedOrigin: [origin, 'https://vpds.org.in', 'https://www.vpds.org.in'], requireEmail: true }));
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${app.address().port}/api/enquiries`;
  try {
    for (const allowed of [origin, 'https://vpds.org.in', 'https://www.vpds.org.in']) {
      const response = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: allowed } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), allowed);
    }
    const denied = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'https://vpds.org.in.unrelated.example' } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  } finally { await new Promise(resolve => app.close(resolve)); }
});
test('cloud endpoint allows the Pages origin and rejects unconfigured delivery', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-cloud-'));
  const app = createServer(createRequestHandler({ dataDir, allowedOrigin: origin, requireEmail: true }));
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${app.address().port}/api/enquiries`;
  try {
    const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
    const denied = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'https://unrelated.example' } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const response = await fetch(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Website Visitor', email: 'visitor@example.com', purpose: 'Interior design' }) });
    assert.equal(response.status, 503);
    assert.ok((await response.json()).error);
  } finally { await new Promise(resolve => app.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
});

test('cloud delivery errors return an error instead of a successful receipt', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-cloud-failed-'));
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: 1, secure: false, connectionTimeout: 300 });
  const mailer = createEnquiryMailer({ SMTP_USER: 'sender@example.com', SMTP_PASS: 'test-password' }, transport);
  const app = createServer(createRequestHandler({ dataDir, mailer, allowedOrigin: origin, requireEmail: true }));
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/enquiries`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Website Visitor', email: 'visitor@example.com', purpose: 'Interior design' })
    });
    assert.equal(response.status, 503);
    assert.ok((await response.json()).error);
    assert.equal(JSON.parse((await readFile(join(dataDir, 'email-events.jsonl'), 'utf8')).trim()).status, 'failed');
  } finally {
    await new Promise(resolve => app.close(resolve));
    transport.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('provider-parsed JSON bodies are handled without reading an already-consumed stream', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-parsed-'));
  const handler = createRequestHandler({ dataDir, allowedOrigin: origin });
  const app = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    await handler(req, res);
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/enquiries`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Website Visitor', email: 'visitor@example.com', purpose: 'Interior design' }) });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(JSON.parse((await readFile(join(dataDir, 'enquiries.jsonl'), 'utf8')).trim()).id, result.id);
  } finally { await new Promise(resolve => app.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
});
