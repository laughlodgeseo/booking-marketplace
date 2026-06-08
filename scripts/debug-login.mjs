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
    if (box && box.width > 0 && box.height > 0) {
      await loc.fill(value);
      return true;
    }
  }
  return false;
}

async function clickVisible(page, selector) {
  const locs = await page.locator(selector).all();
  for (const loc of locs) {
    const box = await loc.boundingBox();
    if (box && box.width > 0 && box.height > 0) {
      await loc.click({ force: true });
      return true;
    }
  }
  return false;
}

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

await p.goto("http://localhost:3000/login?role=vendor", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2000);
console.log("URL:", p.url());

const emailOk = await fillVisible(p, 'input[type="email"]', "vendor.oasis@rentpropertyuae.com");
const passOk = await fillVisible(p, 'input[type="password"]', "Password123!");
console.log("Email filled:", emailOk, "| Password filled:", passOk);

await p.screenshot({ path: "scripts/verify-screenshots/before-submit.png" });

const clicked = await clickVisible(p, 'button[type="submit"]');
console.log("Submit clicked:", clicked);

// Wait with fallback
try {
  await p.waitForURL(u => !u.includes("/login"), { timeout: 8000 });
} catch {
  await p.waitForTimeout(4000);
}
console.log("URL after submit:", p.url());
await p.screenshot({ path: "scripts/verify-screenshots/after-submit.png" });

const loggedIn = !p.url().includes("/login");
console.log("Logged in:", loggedIn);

if (loggedIn) {
  await p.goto("http://localhost:3000/vendor/property-fees", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  console.log("Fees URL:", p.url());

  const html = await p.content();
  const aedMatches = html.match(/AED[\s ][\d,]+\.\d{2}/g) || [];
  console.log("AED amounts:", aedMatches);

  const badFmt = /AED[\s ]\d{4,}\.\d{2}/.test(html);
  console.log("Bad format (no comma for 4+ digits):", badFmt);
  console.log("Has Property Fees in sidebar:", html.includes("Property Fees"));
  console.log("Has raw key:", html.includes("portal.nav.propertyFees"));
  console.log("Raw JSON error:", html.includes('"statusCode"') && html.includes('"message"'));
  console.log("Parser error:", html.includes("Unexpected token") || html.includes("is not valid JSON"));

  const payBtns = await p.locator('button').filter({ hasText: /^Pay fee$/ }).all();
  const payAllBtns = await p.locator('button').filter({ hasText: /Pay all outstanding/ }).all();
  console.log("Pay fee buttons:", payBtns.length, "| Pay all buttons:", payAllBtns.length);

  await p.screenshot({ path: "scripts/verify-screenshots/fees-page.png", fullPage: true });

  // Click first visible pay button
  let payClicked = false;
  for (const btn of [...payBtns, ...payAllBtns]) {
    const box = await btn.boundingBox();
    if (box && box.width > 0) {
      await btn.click();
      payClicked = true;
      console.log("Clicked pay button");
      break;
    }
  }

  if (payClicked) {
    await p.waitForTimeout(5000);
    await p.screenshot({ path: "scripts/verify-screenshots/modal.png" });

    const mhtml = await p.content();
    console.log("Modal raw JSON:", mhtml.includes('"statusCode"') && mhtml.includes('"error"'));
    console.log("Modal parser error:", mhtml.includes("Unexpected token") || mhtml.includes("is not valid JSON"));

    const preparing = await p.getByText(/preparing secure payment/i).isVisible().catch(() => false);
    const payNow = await p.getByRole("button", { name: /pay now/i }).isVisible().catch(() => false);
    const friendlyErr = await p.getByText(/we could not start|temporarily unavailable|no longer payable/i).isVisible().catch(() => false);
    const tryAgain = await p.getByRole("button", { name: /try again/i }).isVisible().catch(() => false);
    const stripeIframe = await p.locator('iframe[title*="Secure"], iframe[name*="stripe"], [data-element-type]').count();

    console.log("Modal: preparing=", preparing, "payNow=", payNow, "friendlyErr=", friendlyErr, "tryAgain=", tryAgain, "stripeElements=", stripeIframe);

    const visibleTexts = await p.locator('[role="dialog"] *').allInnerTexts().catch(() => []);
    console.log("Modal text (first 5 elements):", visibleTexts.slice(0, 5).map(t => t.trim()).filter(Boolean));
  }
}

await b.close();
