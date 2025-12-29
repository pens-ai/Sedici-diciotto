import nodemailer from 'nodemailer';

let transporter;

if (process.env.EMAIL_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  // Development: log emails to console
  transporter = {
    sendMail: async (options) => {
      console.log('\n📧 Email (dev mode - not sent):');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Text:', options.text);
      if (options.html) {
        console.log('HTML preview available');
      }
      console.log('---\n');
      return { messageId: 'dev-mode' };
    },
  };
}

export default transporter;

export const emailConfig = {
  from: process.env.EMAIL_FROM || 'Gestionale Case Vacanza <noreply@example.com>',
};
