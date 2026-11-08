import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import { createApp } from './server.mjs';
import { createEnquiryMailer } from './mail.mjs';

test('a submission emails the fixed studio address with visitor reply-to and all details', async () => {
  let message = '';
  const smtp = createServer(socket => {
    socket.write('220 localhost test SMTP\r\n');
    let buffer = '', receiving = false;
    socket.on('data', chunk => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (receiving) {
          if (line === '.') { receiving = false; socket.write('250 Accepted\r\n'); }
          else message += line + '\r\n';
        } else if (/^(EHLO|HELO)/.test(line)) socket.write('250 localhost\r\n');
        else if (/^(MAIL FROM|RCPT TO)/.test(line)) socket.write('250 OK\r\n');
        else if (line === 'DATA') { receiving = true; socket.write('354 End with dot\r\n'); }
        else if (line === 'QUIT') socket.end('221 Goodbye\r\n');
      }
    });
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: smtp.address().port, secure: false });
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-mail-'));
  const mailer = createEnquiryMailer({ SMTP_USER: 'sender@example.com', SMTP_PASS: 'test-password', MAIL_FROM: 'sender@example.com', ENQUIRY_TO: 'studio@example.com' }, transport);
  const app = createApp({ dataDir, mailer, requireEmail: true, allowedOrigin: 'https://pratik2301.github.io' });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/enquiries`, { method: 'POST', headers: { Origin: 'https://pratik2301.github.io', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Website Visitor', email: 'visitor@example.com', purpose: 'Interior design', message: 'Please design my apartment.', to: 'unwanted@example.com' }) });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.emailStatus, 'sent');
    assert.match(message, /To: studio@example\.com/);
    assert.match(message, /Reply-To:.*visitor@example\.com/);
    assert.match(message, /Website Visitor/);
    assert.match(message, /Interior design/);
    assert.match(message, /Please design my apartment\./);
    assert.ok(message.includes(result.id));
    assert.ok(!message.includes('unwanted@example.com'));
    assert.equal(JSON.parse((await readFile(join(dataDir, 'email-events.jsonl'), 'utf8')).trim()).status, 'sent');
  } finally {
    await new Promise(resolve => app.close(resolve));
    transport.close();
    await new Promise(resolve => smtp.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('SMTP failure preserves the enquiry and does not claim an email was sent', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'vpds-mail-failure-'));
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: 1, secure: false, connectionTimeout: 300 });
  const mailer = createEnquiryMailer({ SMTP_USER: 'sender@example.com', SMTP_PASS: 'test-password' }, transport);
  const app = createApp({ dataDir, mailer });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/enquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Website Visitor', email: 'visitor@example.com', purpose: 'Interior design' }) });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.emailStatus, 'failed');
    assert.equal(JSON.parse((await readFile(join(dataDir, 'enquiries.jsonl'), 'utf8')).trim()).id, result.id);
    assert.equal(JSON.parse((await readFile(join(dataDir, 'email-events.jsonl'), 'utf8')).trim()).status, 'failed');
  } finally { await new Promise(resolve => app.close(resolve)); transport.close(); await rm(dataDir, { recursive: true, force: true }); }
});

test('missing SMTP credentials leave email unconfigured', () => {
  assert.equal(createEnquiryMailer({}), null);
});
