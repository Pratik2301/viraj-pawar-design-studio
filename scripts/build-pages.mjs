import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
await mkdir(join(output, 'assets'), { recursive: true });
let html = await readFile(join(root, 'index.html'), 'utf8');
if (!html.includes('<form id="enquiry-form"')) throw new Error('Cannot locate the enquiry form for the Pages export.');
const vercel = process.argv.includes('--vercel');
const endpoint = vercel ? null : process.env.ENQUIRY_API_URL;
if (endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('ENQUIRY_API_URL must be a public HTTPS endpoint without credentials, query or fragment.');
  const attribute = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  html = html.replace('<form id="enquiry-form"', `<form id="enquiry-form" data-endpoint="${attribute}"`);
} else if (!vercel) {
  html = html.replace('<form id="enquiry-form"', '<form id="enquiry-form" data-delivery="email"');
  html = html.replace('<span>Send your enquiry</span>', '<span>Prepare enquiry email</span>');
  html = html.replace('Your details are used only to respond to your enquiry.', 'Prepare your enquiry, then open and send the draft from your email app.');
  html = html.replace('<h3>Thank you,<br><em id="visitor-name"></em></h3>', '<h3>Your enquiry,<br><em>ready to send.</em></h3>');
}
html = html.replace('Please enable JavaScript for the interactive design journey and enquiry form.', 'Please enable JavaScript for the interactive design journey and enquiry form. You can also contact the studio directly by phone or email.');
await writeFile(join(output, 'index.html'), html);
for (const file of ['styles.css', 'app.js']) await copyFile(join(root, file), join(output, file));
for (const file of ['logo-transparent.png', 'residences.png', 'apartment-interior.png', 'arrows.svg']) await copyFile(join(root, 'assets', file), join(output, 'assets', file));
await writeFile(join(output, '.nojekyll'), '');
console.log(`Built ${vercel ? 'Vercel' : 'GitHub Pages'} site in dist/ with ${vercel || endpoint ? 'online SMTP' : 'email-draft'} enquiries.`);
