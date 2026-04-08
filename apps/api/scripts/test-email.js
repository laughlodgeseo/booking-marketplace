#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Test Resend email delivery.
 *
 * Usage:
 *   node scripts/test-email.js [recipient_email] [otp_code]
 *
 * Loads RESEND_API_KEY from .env.local or .env automatically.
 */
const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1).trim();
      }
    }
    out[key] = value;
  }
  return out;
}

function loadEnvDefaults() {
  const envFiles = ['.env.local', '.env'];
  for (const fileName of envFiles) {
    const envPath = path.resolve(__dirname, '..', fileName);
    if (!fs.existsSync(envPath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function getConfig() {
  loadEnvDefaults();

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from =
    (process.env.SMTP_FROM || '').trim() ||
    'RentPropertyUAE <booking@rentpropertyuae.com>';
  const replyTo = (process.env.SMTP_REPLY_TO || '').trim() || undefined;
  const to = process.argv[2] || process.env.EMAIL_TEST_TO || '';
  const otpCode = process.argv[3] || '123456';

  return { apiKey, from, replyTo, to, otpCode };
}

async function runTest() {
  const config = getConfig();

  if (!config.apiKey) {
    console.error('CONFIG ERROR: RESEND_API_KEY is required');
    process.exitCode = 1;
    return;
  }
  if (!config.to) {
    console.error(
      'CONFIG ERROR: Pass recipient email as first arg or set EMAIL_TEST_TO',
    );
    process.exitCode = 1;
    return;
  }

  // Dynamic import for ESM-only packages loaded from CJS context
  let Resend;
  try {
    ({ Resend } = require('resend'));
  } catch {
    console.error(
      'Failed to require resend. Run: pnpm --filter api add resend',
    );
    process.exitCode = 1;
    return;
  }

  const resend = new Resend(config.apiKey);

  console.log(`Sending test OTP email via Resend...`);
  console.log(`  From   : ${config.from}`);
  console.log(`  To     : ${config.to}`);
  console.log(`  OTP    : ${config.otpCode}`);

  try {
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: [config.to],
      subject: 'Your OTP Code – RentPropertyUAE',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#eef2ff;border-radius:16px;">
          <h2 style="color:#312e81;margin:0 0 16px;">Email verification</h2>
          <p style="color:#374151;margin:0 0 20px;">Your one-time verification code is:</p>
          <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#312e81;background:#fff;border:1px solid #c7d2fe;border-radius:12px;padding:20px;text-align:center;">
            ${config.otpCode}
          </div>
          <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
          <hr style="border:none;border-top:1px solid #e0e7ff;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;margin:0;">RentPropertyUAE &bull; rentpropertyuae.com</p>
        </div>
      `,
      text: `Your RentPropertyUAE OTP code is ${config.otpCode}. It expires in 10 minutes. Do not share it with anyone.`,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    });

    if (error) {
      console.error('RESEND_SEND_ERROR:', JSON.stringify(error, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log('RESEND_SEND_SUCCESS:', JSON.stringify(data, null, 2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('RESEND_SEND_ERROR:', message);
    process.exitCode = 1;
  }
}

runTest();
