const { chromium } = require("playwright");

const siteUrl = process.env.COTAR3D_URL || "https://cotar3d.web.app/?pwa-test=1";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto(siteUrl, { waitUntil: "networkidle", timeout: 45000 });

  const serviceWorkerReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;

    return Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 10000)),
    ]);
  });

  if (!serviceWorkerReady) throw new Error("Service worker não ficou pronto.");

  await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });

  const h1 = await page.locator("h1").innerText();
  const suggestedPrice = await page.locator("#suggestedPrice").innerText();
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(false);
  await browser.close();

  if (!controlled || !h1.includes("preço") || !suggestedPrice.includes("R$")) {
    throw new Error("A interface principal não ficou funcional offline.");
  }

  console.log(`offline: controlado=${controlled}; h1=${h1}; venda=${suggestedPrice}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
