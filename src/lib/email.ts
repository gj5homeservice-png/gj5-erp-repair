// No email service (SMTP or an API like Resend/SendGrid/Postmark) is
// connected in this app yet — this file is the single place that will
// change once one is. Every caller checks isEmailSendingConfigured() first
// and degrades to a clear "not configured yet" state rather than pretending
// to send anything (see /api/auth/change-email/request).

export function isEmailSendingConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendEmail(_to: string, _subject: string, _body: string): Promise<void> {
  if (!isEmailSendingConfigured()) {
    throw new Error('Email sending is not configured yet.');
  }
  // Intentionally left unimplemented: wire up nodemailer (or an HTTP email
  // API) here once SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD (or an
  // API key) are available in .env. Every caller already treats
  // isEmailSendingConfigured() === false as an expected, handled state, so
  // adding the real transport here is the only change needed to make actual
  // delivery work end-to-end.
  throw new Error('Email transport not yet implemented.');
}
