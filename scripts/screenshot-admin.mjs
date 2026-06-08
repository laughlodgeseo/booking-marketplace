import { createRequire } from "module";
import { mkdir } from "fs/promises";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("C:/Users/ANC/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright"); }
const { chromium } = playwright;

await mkdir("scripts/verify-screenshots", { recursive: true });

async function fillVisible(page, selector, value) {
  for (const loc of await page.locator(selector).all()) {
    const box = await loc.boundingBox();
    if (box?.width > 0) { await loc.fill(value); return true; }
  }
  return false;
}
async function clickVisible(page, selector) {
  for (const loc of await page.locator(selector).all()) {
    const box = await loc.boundingBox();
    if (box?.width > 0) { await loc.click({ force: true }); return true; }
  }
  return false;
}

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

await p.goto("http://localhost:3000/admin/login", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2000);
await fillVisible(p, 'input[type="email"]', "admin@rentpropertyuae.com");
await fillVisible(p, 'input[type="password"]', "Password123!");
await clickVisible(p, 'button[type="submit"]');
try { await p.waitForURL(u => !u.includes("/login"), { timeout: 8000 }); } catch { await p.waitForTimeout(4000); }
console.log("URL after login:", p.url());
const loggedIn = !p.url().includes("/login");
console.log("Admin logged in:", loggedIn);

if (loggedIn) {
  await p.goto("http://localhost:3000/admin/vendor-payout-methods?status=ALL", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: "scripts/verify-screenshots/admin-payout-list.png" });
  console.log("Screenshot: admin-payout-list.png");

  const detailBtns = await p.locator('button').filter({ hasText: /Details/ }).all();
  console.log("Detail buttons:", detailBtns.length);

  let opened = false;
  for (const btn of detailBtns) {
    const box = await btn.boundingBox();
    if (box?.width > 0) { await btn.click(); opened = true; break; }
  }

  if (opened) {
    await p.waitForTimeout(2000);
    await p.screenshot({ path: "scripts/verify-screenshots/admin-payout-modal.png" });
    console.log("Screenshot: admin-payout-modal.png");

    const html = await p.content();
    console.log("Has Approve button:", html.includes("Approve"));
    console.log("Has Reject button:", html.includes("Reject"));
    console.log("Has backdrop-blur:", html.includes("backdrop-blur"));
    console.log("Has fixed inset-0:", html.includes("inset-0"));
    console.log("Has max-h (no full-page scroll):", html.includes("max-h"));

    // Verify no double scrollbar
    const scrollContainers = html.match(/overflow-y-auto/g) ?? [];
    console.log("overflow-y-auto occurrences in modal:", scrollContainers.length);
  } else {
    console.log("No payout methods visible. Status ALL should show all.");
  }
}

await b.close();
