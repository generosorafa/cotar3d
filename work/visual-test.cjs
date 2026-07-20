const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const localSiteUrl = pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;
const siteUrl = process.env.COTAR3D_URL || localSiteUrl;
const outputDir = path.resolve(__dirname, "screenshots");

fs.mkdirSync(outputDir, { recursive: true });

async function testViewport(browser, config) {
  const page = await browser.newPage({ viewport: config.viewport });
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(siteUrl, { waitUntil: "networkidle", timeout: 45000 });

  const title = await page.title();
  const h1 = await page.locator("h1").first().innerText();
  const navText = await page.locator(".nav").first().innerText();

  await page.locator("#quoteForm").waitFor({ state: "visible", timeout: 15000 });
  await page.locator('[name="materialKgPrice"]').fill("95");
  await page.locator('[name="consumedGrams"]').fill("120");
  await page.locator('[name="printHours"]').fill("8");
  await page.locator('[name="energyRate"]').fill("0.95");
  await page.locator('[name="marginPercent"]').fill("45");
  await page.locator('[name="quantity"]').fill("4");

  const cost = await page.locator("#totalCost").innerText();
  const suggested = await page.locator("#suggestedPrice").innerText();
  const unitSummary = await page.locator("#unitPriceSummary").innerText();

  await page.click("#openClientQuote");
  const quoteDialogVisible = await page.locator("#clientQuoteDialog").isVisible();
  const clientQuoteText = await page.locator("#clientQuoteDialog").innerText();
  const clientQuoteQuantity = await page.locator("#clientQuoteQuantity").innerText();
  const clientQuoteTotal = await page.locator("#clientQuoteTotal").innerText();
  const quoteScreenshot = path.join(outputDir, `cotar3d-orcamento-${config.name}.png`);
  await page.screenshot({ path: quoteScreenshot });
  await page.emulateMedia({ media: "print" });
  const headerHiddenForPrint = await page.locator(".topbar").evaluate((element) => {
    return getComputedStyle(element).display === "none";
  });
  const quoteVisibleForPrint = await page.locator("#clientQuoteDialog").evaluate((element) => {
    return getComputedStyle(element).display !== "none";
  });
  await page.emulateMedia({ media: "screen" });
  await page.click("#closeClientQuote");

  const screenshot = path.join(outputDir, `cotar3d-${config.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  await page.click('a[href="#metodo"]');
  await page.waitForTimeout(250);

  const activeAfterMetodo = await page
    .locator('.nav [aria-current="page"]')
    .innerText()
    .catch(() => "");

  await page.close();

  const failures = [];
  if (!title.includes("Cotar3D")) failures.push(`titulo inesperado: ${title}`);
  if (!h1.toLowerCase().includes("impressão") || !h1.toLowerCase().includes("preço")) {
    failures.push(`h1 inesperado: ${h1}`);
  }
  for (const label of ["Calcular", "Guia", "Método", "Pro"]) {
    if (!navText.includes(label)) failures.push(`menu sem ${label}`);
  }
  if (!cost.includes("R$")) failures.push(`custo nao renderizou: ${cost}`);
  if (!suggested.includes("R$")) failures.push(`preco sugerido nao renderizou: ${suggested}`);
  if (!unitSummary.includes("4 peças") || !unitSummary.includes("por peça")) {
    failures.push(`preco unitario inesperado: ${unitSummary}`);
  }
  if (!quoteDialogVisible) failures.push("orcamento do cliente nao abriu");
  if (!clientQuoteQuantity.includes("4 peças") || !clientQuoteTotal.includes("R$")) {
    failures.push("orcamento do cliente sem quantidade ou total");
  }
  if (clientQuoteText.includes("Custo real") || clientQuoteText.includes("Lucro líquido")) {
    failures.push("orcamento do cliente revelou dados internos");
  }
  if (!headerHiddenForPrint || !quoteVisibleForPrint) {
    failures.push("modo de impressao nao isolou o orcamento do cliente");
  }
  if (activeAfterMetodo !== "Método") failures.push(`menu ativo inesperado: ${activeAfterMetodo}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(" | ")}`);

  return {
    name: config.name,
    title,
    h1,
    cost,
    suggested,
    unitSummary,
    activeAfterMetodo,
    screenshot,
    failures,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const config of [
    { name: "desktop", viewport: { width: 1440, height: 1000 } },
    { name: "mobile", viewport: { width: 390, height: 844 } },
  ]) {
    results.push(await testViewport(browser, config));
  }

  await browser.close();

  for (const result of results) {
    console.log(
      `${result.name}: custo=${result.cost}; venda=${result.suggested}; unidade=${result.unitSummary}; nav=${result.activeAfterMetodo}; screenshot=${result.screenshot}`
    );
    if (result.failures.length) {
      for (const failure of result.failures) console.error(`- ${result.name}: ${failure}`);
    }
  }

  if (results.some((result) => result.failures.length)) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
