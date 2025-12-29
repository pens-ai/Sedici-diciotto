import transporter, { emailConfig } from '../config/email.js';

export const sendVerificationEmail = async (email, token, firstName) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6b4ce6;">Benvenuto in Gestionale Case Vacanza!</h1>
      <p>Ciao ${firstName || 'Utente'},</p>
      <p>Grazie per esserti registrato. Per completare la registrazione, verifica il tuo indirizzo email cliccando sul pulsante qui sotto:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #6b4ce6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verifica Email
        </a>
      </div>
      <p>Oppure copia e incolla questo link nel tuo browser:</p>
      <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
      <p style="margin-top: 30px; color: #999; font-size: 12px;">
        Se non hai creato questo account, puoi ignorare questa email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: emailConfig.from,
    to: email,
    subject: 'Verifica il tuo indirizzo email - Gestionale Case Vacanza',
    html,
    text: `Benvenuto! Verifica il tuo email visitando: ${verifyUrl}`,
  });
};

export const sendPasswordResetEmail = async (email, token, firstName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6b4ce6;">Reset Password</h1>
      <p>Ciao ${firstName || 'Utente'},</p>
      <p>Hai richiesto di reimpostare la tua password. Clicca sul pulsante qui sotto per procedere:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #6b4ce6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reimposta Password
        </a>
      </div>
      <p>Oppure copia e incolla questo link nel tuo browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p style="color: #e74c3c; font-weight: bold;">Questo link scadrà tra 1 ora.</p>
      <p style="margin-top: 30px; color: #999; font-size: 12px;">
        Se non hai richiesto il reset della password, puoi ignorare questa email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: emailConfig.from,
    to: email,
    subject: 'Reset Password - Gestionale Case Vacanza',
    html,
    text: `Reset password: ${resetUrl} (scade tra 1 ora)`,
  });
};

export const sendWelcomeEmail = async (email, firstName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6b4ce6;">Email Verificata!</h1>
      <p>Ciao ${firstName || 'Utente'},</p>
      <p>Il tuo indirizzo email è stato verificato con successo. Ora puoi accedere a tutte le funzionalità del gestionale.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/login" style="background-color: #6b4ce6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Vai al Login
        </a>
      </div>
      <p>Buon lavoro!</p>
    </div>
  `;

  await transporter.sendMail({
    from: emailConfig.from,
    to: email,
    subject: 'Benvenuto! - Gestionale Case Vacanza',
    html,
    text: `Email verificata! Accedi su: ${process.env.FRONTEND_URL}/login`,
  });
};
