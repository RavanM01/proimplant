/**
 * Notification helpers: email (to doctors) and SMS (to patients).
 *
 * Both are OPTIONAL and configured entirely through environment variables.
 * If the relevant env vars are not set, the notification is simply logged to
 * the console instead of being sent — so the app runs fine locally / on the
 * free plan without any credentials, and starts sending for real once you add
 * the config.
 *
 * Email  -> standard SMTP (Gmail, Zoho, your host's mail, etc.) via nodemailer.
 * SMS    -> Twilio REST API (no SDK needed, uses global fetch).
 */
const nodemailer = require('nodemailer');

// ---- Email -----------------------------------------------------------------
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE) === 'true', // true for 465
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!to) return;
  if (!transporter) {
    console.log(`[mail:skipped — SMTP not configured] to=${to} | ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    console.log(`[mail:sent] to=${to}`);
  } catch (err) {
    console.error('[mail:error]', err.message);
  }
}

// ---- SMS (Twilio) ----------------------------------------------------------
async function sendSms({ to, body }) {
  if (!to) return;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !tok || !from) {
    console.log(`[sms:skipped — Twilio not configured] to=${to} | ${body}`);
    return;
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );
    if (!res.ok) {
      console.error('[sms:error]', res.status, await res.text());
    } else {
      console.log(`[sms:sent] to=${to}`);
    }
  } catch (err) {
    console.error('[sms:error]', err.message);
  }
}

module.exports = { sendMail, sendSms };
