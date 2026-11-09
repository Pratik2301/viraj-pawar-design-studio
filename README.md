# Viraj Pawar Design Studio

[Public website](https://pratik2301.github.io/viraj-pawar-design-studio/)

A responsive architecture landing page based on the supplied logo and `index.html`. The original page is preserved as `index.original.html`.

## Run locally

Requires Node.js 20.12 or newer. Install the email dependency once with `npm install`.

```powershell
cd path/to/viraj-pawar-design-studio
npm install
npm start
```

Open http://localhost:3000. `npm run dev` restarts the server when its source changes. Reload the browser after editing HTML, CSS or JavaScript.

## What works

- Transparent version of the supplied logo throughout the header, hero, studio and contact sections; subtle logo reveal animation.
- Reversible scroll journey: land → progressively drawn four-storey elevation → realistic residential building → apartment interior. Stage buttons also navigate the journey; architectural notes update with each stage. The numbered image markers have been removed.
- Responsive fixed header, footer in normal page flow, mobile menu, reduced-motion support, keyboard controls.
- Expandable services with changing image/drawing previews and preselected enquiry purposes.
- Interactive four-stage design process.
- Client and server validation for name, email, purpose and optional message; loading, error, retry and receipt states.
- `POST /api/enquiries` saves enquiries in `data/enquiries.jsonl`. This folder is excluded from public routes and Git. No public endpoint exposes submissions.

The local server binds to localhost. The website is published on GitHub Pages; SMTP hosting requires the separate endpoint described below. Local enquiries are saved before email delivery is attempted; the form distinguishes an emailed enquiry from one that was only saved locally.

## Check

```powershell
npm test
```

The integration tests run against a temporary local server and storage directory. They cover valid submissions, durable records, invalid fields, cross-origin requests, body size, content types, private-file protection and storage failure.

## Files

- `index.html` — content and accessible page structure.
- `styles.css` — branding, responsive layout and animation.
- `app.js` — scroll story, service previews, process and enquiry submission.
- `server.mjs` — Node HTTP server, validation, enquiry storage and notification status.
- `mail.mjs` — SMTP email delivery via Nodemailer, addressed only to the studio.
- `assets/` — supplied logo and generated concept visuals.

The background `#FFFCF5` was sampled from the supplied logo. Google Fonts supplies Cormorant Garamond and Manrope; local serif/sans-serif fallbacks work without it. All architectural imagery is labelled as concept work, not completed studio projects. See `docs/image-prompts.md` for the image-generation record.


## Contact and email delivery

The footer has a Contact us link and `tel:+917350600441`. The main Contact us section also offers a direct email link to `virajpawar.nsk225@gmail.com`.

Every valid form submission is saved in `data/enquiries.jsonl`. When SMTP is configured, it is emailed to the server-configured **ENQUIRY_TO** address, with the visitor as Reply-To and their name, email, purpose, message and enquiry reference in the body. The browser cannot override the recipient. Delivery status is recorded in `data/email-events.jsonl`.

The local `.env` has been created with Gmail defaults and an empty password. It is excluded from Git and public routes. To enable delivery:

1. Enable 2-Step Verification on the sending Google account, if it is not already enabled.
2. Create a [Google app password](https://support.google.com/accounts/answer/185833). Use this instead of your regular account password.
3. Set `SMTP_PASS` in `.env` locally. Do not paste it into chat or commit it. Set `SMTP_USER`, `MAIL_FROM` and `ENQUIRY_TO` to your sending account and preferred notification inbox.
4. Restart with `npm start`. For another SMTP service, change `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` as required.

With no credential, the enquiry is saved and the visitor sees direct contact details; the site does not claim an email was sent. SMTP errors also preserve the enquiry and record a failed status. There is no automatic resend worker; review failed events before resending to avoid duplicates.

The mail integration is tested with a local SMTP server; live Gmail delivery must be verified after the credential is configured. Tests cover email addressing/content, SMTP failure, missing credentials and validation/storage behavior. See [Nodemailer SMTP documentation](https://nodemailer.com/smtp) for transport settings.


## Public GitHub Pages version

The public site includes the enquiry form, with name, email, purpose and message fields. It prepares a prefilled email draft for the visitor to open and send from their email app. It does not claim to save or send an online submission. Direct phone and email contact remain available. The Node form/server remains available for local use or a future server deployment.

`npm run build:pages` creates a static `dist/` containing only HTML, CSS, JavaScript and the three used image assets. The export configures the enquiry form to prepare an email draft, since GitHub Pages cannot execute the Node enquiry server. `.github/workflows/pages.yml` tests and publishes that export on pushes to `main`.

Local `.env` values, enquiry records, preview screenshots, original-page backups and unused concept images are excluded from the public repository and deployed artifact.

## Enable online SMTP enquiries

`api/enquiries.js` is a Vercel Node function that reuses the local server's validation and mail delivery. It permits browser requests from `https://pratik2301.github.io` and reports success only after SMTP accepts the email. The function awaits delivery before returning. Credentials stay on the backend; never add them to the GitHub Pages build variables or frontend files.

1. Import this repository into Vercel with the supplied `vercel.json` (Other framework, no build command, `public` output). Disable deployment protection for the production API so website visitors can reach it.
2. Configure these Vercel **Production environment variables** securely, then deploy:

   ```text
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=virajpawar.nsk225@gmail.com
   SMTP_PASS=<Google app password; never commit>
   MAIL_FROM=virajpawar.nsk225@gmail.com
   ENQUIRY_TO=virajpawar.nsk225@gmail.com
   ALLOWED_ORIGIN=https://pratik2301.github.io
   ```

3. Verify a real enquiry reaches the inbox through `https://<production-host>/api/enquiries`. Missing credentials and SMTP failures must return an error, not a successful receipt.
4. Only after verification, add the GitHub Actions repository **variable** `ENQUIRY_API_URL` with that HTTPS endpoint and rerun the Pages workflow. The export then uses the server instead of preparing email drafts. Delete that variable and rebuild to restore email drafts.

The Vercel function writes temporary diagnostic records under `/tmp`; these are **not durable enquiry storage**. Delivered email is the online record. The local Node server still saves durable records under `data/`. Rate limiting is per function instance, with a honeypot and bounded validated input; use shared rate limiting if traffic requires it. SMTP acceptance does not guarantee inbox placement; check spam during the live delivery test.
