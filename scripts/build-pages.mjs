import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
await mkdir(join(output, 'assets'), { recursive: true });
let html = await readFile(join(root, 'index.html'), 'utf8');
if (!html.includes('<form id="enquiry-form"')) throw new Error('Cannot locate the enquiry form for the Pages export.');
html = html.replace(/<form id="enquiry-form"[\s\S]*?<\/form>/, `
  <div class="public-contact-panel reveal">
    <img src="assets/apartment-interior.png" alt="A warm apartment interior with a planted balcony" width="1536" height="1024" loading="lazy">
    <h3>Let’s start a conversation.</h3>
    <p>Tell us about the space you have in mind. We’d love to hear your ideas.</p>
    <a class="submit-button" href="mailto:virajpawar.nsk2001@gmail.com?subject=Project%20enquiry%20%E2%80%94%20Viraj%20Pawar%20Design%20Studio"><span>Email the studio</span><span aria-hidden="true">↗</span></a>
    <a class="public-call" href="tel:+917350600441">Or call +91 7350600441 <span aria-hidden="true">↗</span></a>
  </div>`);
html = html.replace('Please enable JavaScript for the interactive design journey and enquiry form.', 'Please enable JavaScript for the interactive design journey. You can contact the studio by phone or email.');
await writeFile(join(output, 'index.html'), html);
for (const file of ['styles.css', 'app.js']) await copyFile(join(root, file), join(output, file));
for (const file of ['logo-transparent.png', 'residences.png', 'apartment-interior.png']) await copyFile(join(root, 'assets', file), join(output, 'assets', file));
await writeFile(join(output, '.nojekyll'), '');
console.log('Built GitHub Pages site in dist/ with phone and email contact.');
