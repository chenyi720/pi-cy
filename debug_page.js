const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Bypass cache
  await page.goto('http://localhost:3456', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check sidebar computed style
  const sidebarStyle = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const computed = window.getComputedStyle(sidebar);
    return {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      width: computed.width,
      height: computed.height,
      inlineStyle: sidebar.style.cssText,
      offsetWidth: sidebar.offsetWidth,
      offsetHeight: sidebar.offsetHeight,
      boundingRect: sidebar.getBoundingClientRect()
    };
  });
  console.log('Sidebar computed style:', JSON.stringify(sidebarStyle, null, 2));

  // Check files-view
  const filesViewStyle = await page.evaluate(() => {
    const fv = document.getElementById('files-view');
    const computed = window.getComputedStyle(fv);
    return {
      display: computed.display,
      flexDirection: computed.flexDirection,
      height: computed.height,
      inlineStyle: fv.style.cssText,
      childCount: fv.children.length,
      childTags: Array.from(fv.children).map(c => c.tagName + '.' + c.className)
    };
  });
  console.log('Files-view style:', JSON.stringify(filesViewStyle, null, 2));

  // Check if sidebar is actually visible in viewport
  const isSidebarVisible = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const rect = sidebar.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0
    };
  });
  console.log('Sidebar viewport:', JSON.stringify(isSidebarVisible, null, 2));

  await browser.close();
})();
