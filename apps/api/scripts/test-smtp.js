#!/usr/bin/env node
// This script has been superseded by test-email.js (Resend API).
// Run: node scripts/test-email.js [recipient_email] [otp_code]
console.error('This script is deprecated. Use test-email.js instead:');
console.error('  node scripts/test-email.js recipient@example.com 123456');
process.exitCode = 1;
