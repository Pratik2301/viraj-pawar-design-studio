import nodemailer from 'nodemailer';

export function createEnquiryMailer(env = process.env, transport) {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  const port = Number(env.SMTP_PORT || 465);
  const sender = env.MAIL_FROM || env.SMTP_USER;
  const recipient = env.ENQUIRY_TO || 'virajpawar.nsk2001@gmail.com';
  const smtp = transport || nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 7000, greetingTimeout: 5000, socketTimeout: 7000,
    disableFileAccess: true, disableUrlAccess: true
  });
  return {
    async send(record) {
      const result = await smtp.sendMail({
        from: { name: 'Viraj Pawar Design Studio', address: sender },
        to: recipient,
        replyTo: { name: record.name.replace(/[\r\n]/g, ' '), address: record.email },
        subject: `New website enquiry: ${record.purpose} [${record.id}]`,
        text: [
          'New enquiry — Viraj Pawar Design Studio', '',
          `Reference: ${record.id}`, `Name: ${record.name}`, `Email: ${record.email}`,
          `Purpose: ${record.purpose}`, '', 'Message:', record.message || '(No additional message)', '',
          `Submitted: ${record.createdAt}`, '', 'Reply to this email to contact the visitor.'
        ].join('\n')
      });
      if (!result.accepted?.includes(recipient)) throw new Error('Notification recipient was not accepted.');
    }
  };
}
