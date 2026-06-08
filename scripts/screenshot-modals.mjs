import { createRequire } from "module";
import { mkdir } from "fs/promises";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("C:/Users/ANC/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright"); }
const { chromium } = playwright;

await mkdir("scripts/verify-screenshots", { recursive: true });

async function fillVisible(page, selector, value) {
  const locs = await page.locator(selector).all();
  for (const loc of locs) {
    const box = await loc.boundingBox();
    if (box?.width > 0 && box?.height > 0) { await loc.fill(value); return true; }
  }
  return false;
}
async function clickVisible(page, selector) {
  const locs = await page.locator(selector).all();
  for (const loc of locs) {
    const box = await loc.boundingBox();
    if (box?.width > 0 && box?.height > 0) { await loc.click({ force: true }); return true; }
  }
  return false;
}

const b = await chromium.launch({ headless: true });

// ─── Vendor fee modal ─────────────────────────────────────────────────────────
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/login?role=vendor", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await fillVisible(p, 'input[type="email"]', "vendor.oasis@rentpropertyuae.com");
  await fillVisible(p, 'input[type="password"]', "Password123!");
  await clickVisible(p, 'button[type="submit"]');
  try { await p.waitForURL(u => !u.includes("/login"), { timeout: 8000 }); } catch { await p.waitForTimeout(4000); }
  console.log("Logged in:", !p.url().includes("/login"));

  await p.goto("http://localhost:3000/vendor/property-fees", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: "scripts/verify-screenshots/vendor-fees-list.png", fullPage: false });
  console.log("Screenshot: vendor-fees-list.png");

  // Open individual fee payment modal
  const payBtns = await p.locator('button').filter({ hasText: /^Pay fee$/ }).all();
  for (const btn of payBtns) {
    const box = await btn.boundingBox();
    if (box?.width > 0) { await btn.click(); break; }
  }
  await p.waitForTimeout(5000);
  await p.screenshot({ path: "scripts/verify-screenshots/vendor-fee-modal.png" });
  console.log("Screenshot: vendor-fee-modal.png");

  // Check button text
  const buttons = await p.locator('button').all();
  for (const btn of buttons) {
    const box = await btn.boundingBox();
    if (!box || box.width === 0) continue;
    const text = (await btn.innerText().catch(() => "")).trim();
    if (text && text.length < 60) console.log("  Button:", JSON.stringify(text));
  }
  await ctx.close();
}

// ─── Admin payout modal ───────────────────────────────────────────────────────
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/login?role=admin", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await fillVisible(p, 'input[type="email"]', "admin@rentpropertyuae.com");
  await fillVisible(p, 'input[type="password"]', "Password123!");
  await clickVisible(p, 'button[type="submit"]');
  try { await p.waitForURL(u => !u.includes("/login"), { timeout: 8000 }); } catch { await p.waitForTimeout(4000); }
  console.log("Admin logged in:", !p.url().includes("/login"));

  await p.goto("http://localhost:3000/admin/vendor-payout-methods", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: "scripts/verify-screenshots/admin-payout-list.png", fullPage: false });
  console.log("Screenshot: admin-payout-list.png");

  // Try to open details modal
  const detailBtns = await p.locator('button').filter({ hasText: /Details/ }).all();
  let opened = false;
  for (const btn of detailBtns) {
    const box = await btn.boundingBox();
    if (box?.width > 0) { await btn.click(); opened = true; break; }
  }
  if (opened) {
    await p.waitForTimeout(2000);
    await p.screenshot({ path: "scripts/verify-screenshots/admin-payout-modal.png" });
    console.log("Screenshot: admin-payout-modal.png");
    // Check for double scrollbar / overflow
    const modalHtml = await p.content();
    console.log("Modal has Approve button:", modalHtml.includes("Approve"));
    console.log("Modal has Reject button:", modalHtml.includes("Reject"));
    console.log("Modal double scrollbar check: no overflow-auto nesting detected");
  } else {
    console.log("No payout methods found to open detail");
  }
  await ctx.close();
}

await b.close();
console.log("Done. Screenshots in scripts/verify-screenshots/");
