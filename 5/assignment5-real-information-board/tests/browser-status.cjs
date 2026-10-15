const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000/5/assignment5-real-information-board/';
const screenshotDir = path.join(__dirname, '..', 'evidence');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  await page.route('https://api.open-meteo.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      utc_offset_seconds: 32400,
      current: { time: '2026-08-28T13:00', temperature_2m: 27.4 },
      current_units: { temperature_2m: '°C' },
    }),
  }));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.click('#fetch-live');
  await page.waitForFunction(() => document.querySelector('#live-badge')?.textContent === 'fresh');
  assert.equal(await page.textContent('#live-value'), '27.4', 'T5-TEST-02 value');
  assert.equal(await page.textContent('#live-unit'), '°C', 'T5-TEST-02 unit');
  assert.match(await page.getAttribute('#live-source', 'href'), /^https:\/\/api\.open-meteo\.com\//, 'T5-TEST-03 source');
  assert.notEqual(await page.textContent('#live-source-time'), '—', 'T5-TEST-04 source time');
  assert.notEqual(await page.textContent('#live-fetched-time'), '—', 'T5-TEST-04 fetched time');

  await page.click('[data-fixture="normal-d1-a"]');
  await page.click('[data-fixture="normal-d1-b"]');
  await page.click('[data-fixture="timeout"]');
  await page.waitForFunction(() => document.querySelector('#replay-freshness')?.textContent === 'stale');
  assert.match(await page.textContent('#replay-value'), /105 pt.*오래된 값/, 'T5-TEST-05 preserved stale value');
  assert.match(await page.textContent('#error-explain'), /마지막 정상값 105를 유지/, 'T5-TEST-06 explanation');

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.textContent('#replay-freshness'), 'stale', 'T5-TEST-09 freshness after reload');
  assert.match(await page.textContent('#replay-value'), /105 pt.*오래된 값/, 'T5-TEST-09 value after reload');

  await page.click('#reset-replay');
  await page.click('[data-fixture="timeout"]');
  await page.waitForFunction(() => document.querySelector('#replay-freshness')?.textContent === 'error');
  assert.equal(await page.textContent('#replay-value'), '—', 'T5-TEST-07 no invented value');
  assert.match(await page.textContent('#error-explain'), /정상값이 아직 없어/, 'T5-TEST-07 explanation');

  const layout = await page.evaluate(() => {
    const ids = ['live-badge', 'live-note', 'error-panel', 'error-explain'];
    const details = Object.fromEntries(ids.map(id => {
      const element = document.getElementById(id);
      const rect = element.getBoundingClientRect();
      return [id, {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }];
    }));
    return {
      viewportWidth: innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      details,
    };
  });
  assert.ok(layout.documentScrollWidth <= layout.viewportWidth, 'T5-TEST-10 no horizontal page overflow');
  for (const [id, box] of Object.entries(layout.details)) {
    assert.ok(box.left >= 0 && box.right <= layout.viewportWidth, `T5-TEST-10 ${id} within viewport width`);
    assert.ok(box.scrollWidth <= box.clientWidth && box.scrollHeight <= box.clientHeight, `T5-TEST-10 ${id} content not clipped`);
  }

  await page.screenshot({ path: path.join(screenshotDir, 't5-1366x768-error.png'), fullPage: true });
  console.log(JSON.stringify({ pass: true, layout }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
