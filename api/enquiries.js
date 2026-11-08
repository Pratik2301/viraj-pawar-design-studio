import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequestHandler } from '../server.mjs';
import { createEnquiryMailer } from '../mail.mjs';

export default createRequestHandler({
  dataDir: join(tmpdir(), 'vpds-enquiries'),
  mailer: createEnquiryMailer(),
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'https://pratik2301.github.io',
  requireEmail: true,
  trustProxy: true
});
