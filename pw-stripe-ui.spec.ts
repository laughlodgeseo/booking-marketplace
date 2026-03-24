import { test, expect } from '@playwright/test';

test.use({
  browserName: 'chromium',
  viewport: { width: 1512, height: 982 },
});

const bookingId = process.env.BOOKING_ID ?? '';
const token = process.env.TOKEN ?? '';
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3002';

test('stripe card element is interactive and intent session initializes', async ({ page }) => {
  expect(bookingId.length).toBeGreaterThan(0);
  expect(token.length).toBeGreaterThan(0);

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.addInitScript((t) => {
    window.sessionStorage.setItem('ll_access_token_v1', t);
  }, token);

  const intentResponsePromise = page.waitForResponse((res) => {
    return res.url().includes('/api/payments/create-intent') && res.request().method() === 'POST';
  });

  await page.goto(`${baseUrl}/checkout/${bookingId}?intro=0`, {
    waitUntil: 'domcontentloaded',
  });

  const intentResponse = await intentResponsePromise;
  expect(intentResponse.status()).toBe(201);

  const intentBody = await intentResponse.json();
  expect(typeof intentBody.clientSecret).toBe('string');
  expect(intentBody.clientSecret.length).toBeGreaterThan(20);

  await expect(page.getByText('Unable to start payment. Please try again or refresh.')).toHaveCount(0);

  await page.fill('input[placeholder="Full name"]', 'Test User');

  const stripeFrame = page
    .frameLocator('iframe[title*="Secure payment input frame"]')
    .first();

  const cardInput = stripeFrame
    .locator('input[autocomplete="cc-number"], input[aria-label*="card number" i], input[name="cardnumber"], input')
    .first();

  await cardInput.waitFor({ state: 'visible', timeout: 30000 });
  await cardInput.click({ timeout: 15000 });
  await cardInput.fill('4242 4242 4242 4242');

  const expInput = stripeFrame.locator('input[autocomplete="cc-exp"]').first();
  if (await expInput.isVisible().catch(() => false)) {
    await expInput.fill('12 / 34');
  }

  const cvcInput = stripeFrame.locator('input[autocomplete="cc-csc"]').first();
  if (await cvcInput.isVisible().catch(() => false)) {
    await cvcInput.fill('123');
  }

  const postalInput = stripeFrame.locator('input[autocomplete="postal-code"]').first();
  if (await postalInput.isVisible().catch(() => false)) {
    await postalInput.fill('12345');
  }

  const countrySelect = stripeFrame.locator('select').first();
  if (await countrySelect.isVisible().catch(() => false)) {
    try {
      await countrySelect.selectOption('US');
    } catch {
      await countrySelect.selectOption({ label: 'United States' });
    }
  }

  const nonEmptyValue = await cardInput.inputValue();
  expect(nonEmptyValue.replace(/\s+/g, '').length).toBeGreaterThan(0);

  const blockedByOverlay = await page.evaluate(() => {
    const iframe = document.querySelector('iframe[title*="Secure payment input frame"]') as HTMLIFrameElement | null;
    if (!iframe) return 'missing_iframe';
    const rect = iframe.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(x, y);
    if (!topEl) return 'missing_top';

    if (topEl === iframe) return 'ok';

    const isDescendant = iframe.contains(topEl);
    if (isDescendant) return 'ok';

    const cls = (topEl as HTMLElement).className || '';
    const id = (topEl as HTMLElement).id || '';
    return `blocked:${String((topEl as HTMLElement).tagName)}#${id}.${String(cls)}`;
  });

  expect(blockedByOverlay).toBe('ok');

  const payNowButton = page.getByRole('button', { name: /^Pay now$/i });
  await expect(payNowButton).toBeEnabled({ timeout: 30000 });
  await payNowButton.click();
  await expect(page.getByText('Payment submitted.')).toBeVisible({ timeout: 30000 });

  if (consoleErrors.length > 0) {
    const critical = consoleErrors.filter((line) => {
      const l = line.toLowerCase();
      return l.includes('payments/create-intent') || l.includes('stripe') || l.includes('payment api error');
    });
    expect(critical).toEqual([]);
  }
});
