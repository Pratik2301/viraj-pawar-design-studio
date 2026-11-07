import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';
import { createApp } from './server.mjs';

test('enquiries persist; invalid requests and private files are rejected', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-test-'));
  const app = createApp({ dataDir });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const submit = (body, headers = {}) => fetch(`${base}/api/enquiries`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
  });
  try {
    const valid = { name: 'Test Visitor', email: 'visitor@example.com', purpose: 'Interior design', message: 'A warm living room.' };
    const response = await submit(valid);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.emailStatus, 'not_configured');
    assert.match(result.id, /^VPDS-/);
    const saved = JSON.parse((await readFile(join(dataDir, 'enquiries.jsonl'), 'utf8')).trim());
    assert.equal(saved.email, valid.email);
    assert.equal(saved.id, result.id);
    assert.equal(saved.message, valid.message);
    assert.equal((await submit({ ...valid, purpose: 'Multistorey residential building' })).status, 201);
    for (const invalid of [{ ...valid, email: 'bad' }, { ...valid, purpose: '<script>' }, { ...valid, name: 12 }, { ...valid, message: 'x'.repeat(2001) }]) {
      assert.equal((await submit(invalid)).status, 400);
    }
    assert.equal((await submit(valid, { Origin: 'https://unrelated.example' })).status, 403);
    assert.equal((await submit(valid, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await submit({ ...valid, message: 'x'.repeat(20000) })).status, 413);
    for (const path of ['/data/enquiries.jsonl', '/data/email-events.jsonl', '/.env', '/.env.example', '/server.mjs', '/mail.mjs', '/index.original.html', '/package.json']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + '/assets/logo.png')).status, 200);
    assert.equal((await fetch(base + '/api/enquiries')).status, 405);
  } finally {
    await new Promise(resolve => app.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('storage failures never return a successful enquiry receipt', async () => {
  const app = createApp({ dataDir: fileURLToPath(new URL('./server.test.mjs', import.meta.url)) });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/enquiries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Visitor', email: 'visitor@example.com', purpose: 'Interior design' })
    });
    assert.equal(response.status, 503);
    assert.ok((await response.json()).error);
  } finally { await new Promise(resolve => app.close(resolve)); }
});

test('Indian names remain intact when a UTF-8 character crosses request chunks', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-unicode-'));
  const app = createApp({ dataDir });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const name = 'विराज पवार';
    const body = Buffer.from(JSON.stringify({ name, email: 'unicode@example.com', purpose: 'Interior design' }));
    const split = body.indexOf(Buffer.from(name)) + 1;
    const response = await new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: app.address().port, path: '/api/enquiries', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
        res.resume(); res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.write(body.subarray(0, split));
      setTimeout(() => req.end(body.subarray(split)), 20);
    });
    assert.equal(response, 201);
    const saved = JSON.parse((await readFile(join(dataDir, 'enquiries.jsonl'), 'utf8')).trim());
    assert.equal(saved.name, name);
  } finally {
    await new Promise(resolve => app.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('repeated successful submissions are rate limited', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-limit-'));
  const app = createApp({ dataDir });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const submit = () => fetch(`http://127.0.0.1:${app.address().port}/api/enquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Visitor', email: 'limit@example.com', purpose: 'Interior design' }) });
    for (let i = 0; i < 20; i++) assert.equal((await submit()).status, 201);
    const blocked = await submit();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('Retry-After'), '600');
  } finally {
    await new Promise(resolve => app.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});
