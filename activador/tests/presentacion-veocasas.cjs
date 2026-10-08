const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.VEOCASAS_URL || 'http://127.0.0.1:8000';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'],
    ...(process.env.VEOCASAS_URL && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    if (process.env.VEOCASAS_URL) await page.route('https://**/*', async r => {
      try { await r.fulfill({ response: await r.fetch({ timeout: 20000 }) }); } catch { await r.abort(); }
    });
    const ciudades = ['Mercedes', 'Montevideo', 'Colonia', 'Paysandú'];
    for (let i = 0; i < 4; i++) {
      await page.goto(base + '/activador/?cuestionario=inmobiliario&camara=0', { waitUntil: 'domcontentloaded' });
      await page.locator('.quiz-invitacion .quiz-arte').waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('.quiz-arte')].every(x => x.complete && x.naturalWidth));
      if (i === 0) await page.screenshot({ path: '/tmp/veocasas-invitacion-web.png' });
      await page.locator('.quiz-invitacion button').click();
      assert.match(await page.locator('.quiz-mudanza button').nth(1).getAttribute('aria-label'), /Por ahora no.*✌/);
      if (i === 0) { await page.waitForFunction(() => document.querySelector('.quiz-arte').complete); await page.screenshot({ path: '/tmp/veocasas-pregunta-web.png' }); }
      await page.locator('.quiz-mudanza button').first().click();
      if (i === 0) { await page.waitForFunction(() => document.querySelector('.quiz-arte').complete); await page.screenshot({ path: '/tmp/veocasas-ciudades-web.png' }); }
      await page.locator('.quiz-destino button').nth(i).click();
      assert.match(await page.locator('.quiz-resultado h1').innerText(), new RegExp(ciudades[i]));
      const qr = page.locator('.quiz-resultado-qr .quiz-qr');
      const u = new URL(await qr.getAttribute('href'));
      assert.equal(u.hostname, 'veocasas.com'); assert.equal(u.searchParams.get('utm_term'), ciudades[i]);
      assert.equal(await qr.locator('svg').count(), 1);
      const bounds = await qr.boundingBox(); assert(bounds.width > 150 && bounds.height > 150);
      assert(bounds.y + bounds.height <= 1280);
      if (i === 0) { await page.waitForFunction(() => document.querySelector('.quiz-arte').complete); await page.screenshot({ path: '/tmp/veocasas-resultado-web.png' }); }
      await page.keyboard.press('Escape'); assert.equal(await page.locator('.quiz-invitacion').count(), 1);
    }
    // Same geometry on a horizontal monitor: complete centred vertical plate.
    await page.setViewportSize({ width: 1280, height: 720 });
    const bounds = await page.locator('.quiz-placa').boundingBox();
    assert(Math.abs(bounds.width / bounds.height - 9 / 16) < .002);
    assert(bounds.x > 400);
    assert.deepEqual(errors, []);
    console.log('PASS: 4 ciudades por toque, placas 9:16, QR real por ciudad, gesto de no, reinicio y monitor horizontal.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
