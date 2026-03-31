#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');

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

function parseIntOr(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value, fallback) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return fallback;
}

function getConfig() {
  loadEnvDefaults();

  const host = process.env.SMTP_HOST || 'mail.rentpropertyuae.com';
  const port = parseIntOr(process.env.SMTP_PORT, 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_FROM_EMAIL ||
    '"RentPropertyUAE" <booking@rentpropertyuae.com>';
  const to = process.argv[2] || process.env.SMTP_TEST_TO || user;
  const otpCode = process.argv[3] || '123456';
  const secure = parseBool(process.env.SMTP_SECURE, port === 465);
  const requireTLS = parseBool(process.env.SMTP_REQUIRE_TLS, true);
  const logger = parseBool(process.env.SMTP_TRANSPORT_LOGGER, true);
  const debug = parseBool(process.env.SMTP_TRANSPORT_DEBUG, true);
  const rejectUnauthorizedRaw = (
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED || ''
  )
    .trim()
    .toLowerCase();
  const rejectUnauthorized =
    rejectUnauthorizedRaw === '0' ||
    rejectUnauthorizedRaw === 'false' ||
    rejectUnauthorizedRaw === 'no'
      ? false
      : true;
  const connectionTimeout = parseIntOr(
    process.env.SMTP_CONNECTION_TIMEOUT_MS,
    15000,
  );
  const greetingTimeout = parseIntOr(
    process.env.SMTP_GREETING_TIMEOUT_MS,
    15000,
  );
  const socketTimeout = parseIntOr(process.env.SMTP_SOCKET_TIMEOUT_MS, 20000);

  return {
    host,
    port,
    user,
    pass,
    from,
    to,
    otpCode,
    secure,
    requireTLS,
    logger,
    debug,
    tls: { rejectUnauthorized },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
  };
}

function exitConfigError(message) {
  console.error(`CONFIG ERROR: ${message}`);
  process.exitCode = 1;
}

async function runTest() {
  const config = getConfig();
  if (!config.user) return exitConfigError('SMTP_USER is required');
  if (!config.pass) return exitConfigError('SMTP_PASS is required');
  if (!config.to) {
    return exitConfigError('Pass recipient email as arg or set SMTP_TEST_TO');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: config.logger,
    debug: config.debug,
    tls: config.tls,
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
  });

  try {
    await transporter.verify();
    console.log('SMTP VERIFIED: Server is ready');
  } catch (err) {
    console.error('VERIFY FAILED:', err);
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${config.otpCode}`,
      html: `<p>Your OTP code is <b>${config.otpCode}</b></p>`,
    });
    console.log('SMTP_SEND_SUCCESS:', info.response);
  } catch (err) {
    const code = err && typeof err === 'object' ? err.code : undefined;
    const response = err && typeof err === 'object' ? err.response : undefined;
    const message = err instanceof Error ? err.message : String(err);
    console.error('SMTP_SEND_ERROR:', code, response, message);
    console.error('SEND FAILED:', err);
  }
}

runTest();
