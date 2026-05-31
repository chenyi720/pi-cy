
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3456', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const cs = window.getComputedStyle(sidebar);
    return {
      display: cs.display,
      inlineStyle: sidebar.style.cssText,
      offsetWidth: sidebar.offsetWidth,
      offsetHeight: sidebar.offsetHeight,
      rect: sidebar.getBoundingClientRect()
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
