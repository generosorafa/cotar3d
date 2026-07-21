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
  const settingsClosedByDefault = !(await page.locator(".settings-details").evaluate((element) => element.open));
  await page.locator(".settings-details summary").click();
  await page.locator('[name="materialKgPrice"]').fill("95");
  await page.locator('[name="consumedGrams"]').fill("120");
  await page.locator('[name="printHours"]').fill("8");
  await page.locator('[name="energyRate"]').fill("0.95");
  await page.locator('[name="marginPercent"]').fill("45");
  await page.locator('[name="quantity"]').fill("4");
  await page.locator(".settings-details summary").click();

  const cost = await page.locator("#totalCost").innerText();
  const suggested = await page.locator("#suggestedPrice").innerText();
  const unitSummary = await page.locator("#unitPriceSummary").innerText();
  const marginSummary = await page.locator("#marginSummary").innerText();
  const alertsClosedByDefault = !(await page.locator("#insightDetails").evaluate((element) => element.open));
  const mobilePriceStripDisplay = await page.locator(".mobile-price-strip").evaluate((element) => {
    return getComputedStyle(element).display;
  });
  const layoutMetrics = await page.evaluate(() => ({
    calculatorTop: document.querySelector("#calculadora").getBoundingClientRect().top + scrollY,
    problemTop: document.querySelector("#problema").getBoundingClientRect().top + scrollY,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    calculatorHeight: document.querySelector("#quoteForm").getBoundingClientRect().height,
    resultHeight: document.querySelector("#quoteResults").getBoundingClientRect().height,
    primaryColumns: getComputedStyle(document.querySelector("#quoteForm fieldset .field-grid"))
      .gridTemplateColumns.split(" ").length,
  }));

  await page.click("#openClientQuote");
  const quoteDialogVisible = await page.locator("#clientQuoteDialog").isVisible();
  const clientQuoteText = await page.locator("#clientQuoteDialog").innerText();
  const clientQuoteQuantity = await page.locator("#clientQuoteQuantity").innerText();
  const clientQuoteTotal = await page.locator("#clientQuoteTotal").innerText();
  const clientQuoteDate = await page.locator("#clientQuoteDate").innerText();
  await page.locator("#printClientQuote").scrollIntoViewIfNeeded();
  const printButtonBox = await page.locator("#printClientQuote").boundingBox();
  const quoteActionsReachable = Boolean(
    printButtonBox &&
    printButtonBox.y >= 0 &&
    printButtonBox.y + printButtonBox.height <= config.viewport.height
  );
  await page.locator(".client-quote-sheet").evaluate((element) => {
    element.scrollTop = 0;
  });
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

  await page.evaluate(() => {
    const toggle = document.querySelector("#advancedToggle");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[name="consumedGrams"]').fill("1000");
  await page.locator('[name="materialKgPrice"]').fill("100");
  await page.locator('[name="printHours"]').fill("0");
  await page.locator('[name="failurePercent"]').fill("10");
  await page.locator('[name="packagingCost"]').fill("100");
  await page.locator('[name="extraSupplies"]').fill("100");
  await page.locator('[name="shippingCost"]').fill("100");
  await page.locator('[name="laborMinutes"]').fill("0");
  await page.locator('[name="taxPercent"]').fill("0");
  await page.locator('[name="marginPercent"]').fill("0");
  const failureReserve = (await page.locator("#breakdownList li").filter({
    hasText: "Reserva para repetir impressão",
  }).textContent()).replace(/\s/g, " ");
  const advancedCalculatorHeight = await page.locator("#quoteForm").evaluate((element) => {
    return element.getBoundingClientRect().height;
  });
  if (!config.mobile) {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.location.hash = "calculadora";
      document.querySelector("#calculadora").scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outputDir, "cotar3d-desktop-completo.png") });
  }
  await page.locator('[name="consumedGrams"]').fill("0");
  const alertsOpenedForCritical = await page.locator("#insightDetails").evaluate((element) => element.open);

  if (config.mobile) {
    await page.evaluate(() => {
      window.location.hash = "metodo";
    });
  } else {
    await page.click('a[href="#metodo"]');
  }
  await page.waitForTimeout(250);

  const activeAfterMetodo = await page
    .locator('.nav [aria-current="page"]')
    .textContent()
    .catch(() => "");

  await page.close();

  const failures = [];
  if (!title.includes("Cotar3D")) failures.push(`titulo inesperado: ${title}`);
  if (!h1.toLowerCase().includes("impressão") || !h1.toLowerCase().includes("preço")) {
    failures.push(`h1 inesperado: ${h1}`);
  }
  const expectedNavLabels = config.mobile ? ["Calcular", "Guia"] : ["Calcular", "Guia", "Método", "Pro"];
  for (const label of expectedNavLabels) {
    if (!navText.includes(label)) failures.push(`menu sem ${label}`);
  }
  if (!settingsClosedByDefault) failures.push("ajustes de impressora deveriam iniciar recolhidos");
  if (!alertsClosedByDefault) failures.push("alertas deveriam iniciar recolhidos");
  if (!alertsOpenedForCritical) failures.push("alertas críticos deveriam abrir automaticamente");
  if (!cost.includes("R$")) failures.push(`custo nao renderizou: ${cost}`);
  if (!suggested.includes("R$")) failures.push(`preco sugerido nao renderizou: ${suggested}`);
  if (!unitSummary.includes("4 peças") || !unitSummary.includes("por peça")) {
    failures.push(`preco unitario inesperado: ${unitSummary}`);
  }
  if (!quoteDialogVisible) failures.push("orcamento do cliente nao abriu");
  if (!clientQuoteQuantity.includes("4 peças") || !clientQuoteTotal.includes("R$")) {
    failures.push("orcamento do cliente sem quantidade ou total");
  }
  if (!clientQuoteDate.includes("Gerado em")) failures.push("orcamento do cliente sem data");
  if (!quoteActionsReachable) failures.push("acoes do orcamento nao ficaram acessiveis no modal");
  if (clientQuoteText.includes("Custo real") || clientQuoteText.includes("Lucro líquido")) {
    failures.push("orcamento do cliente revelou dados internos");
  }
  if (!headerHiddenForPrint || !quoteVisibleForPrint) {
    failures.push("modo de impressao nao isolou o orcamento do cliente");
  }
  if (activeAfterMetodo?.trim() !== "Método") failures.push(`menu ativo inesperado: ${activeAfterMetodo}`);
  if (!marginSummary.includes("31,0%")) failures.push(`margem real inesperada: ${marginSummary}`);
  if (!failureReserve.includes("R$ 10,00")) failures.push(`reserva de falha inesperada: ${failureReserve}`);
  if (layoutMetrics.horizontalOverflow > 1) {
    failures.push(`pagina com overflow horizontal de ${layoutMetrics.horizontalOverflow}px`);
  }
  if (config.mobile && layoutMetrics.calculatorTop >= layoutMetrics.problemTop) {
    failures.push("calculadora deveria vir antes do conteudo explicativo no celular");
  }
  if (config.mobile && mobilePriceStripDisplay === "none") failures.push("atalho de resultado nao apareceu no celular");
  if (!config.mobile && mobilePriceStripDisplay !== "none") failures.push("atalho de resultado apareceu no desktop");
  if (!config.mobile && layoutMetrics.primaryColumns !== 3) {
    failures.push(`formulario desktop com ${layoutMetrics.primaryColumns} colunas`);
  }
  if (!config.mobile && layoutMetrics.calculatorHeight > config.viewport.height - 130) {
    failures.push(`formulario desktop ainda muito alto: ${Math.round(layoutMetrics.calculatorHeight)}px`);
  }
  if (!config.mobile && layoutMetrics.resultHeight > config.viewport.height - 100) {
    failures.push(`painel de resultado desktop ainda muito alto: ${Math.round(layoutMetrics.resultHeight)}px`);
  }
  if (!config.mobile && advancedCalculatorHeight > config.viewport.height - 100) {
    failures.push(`modo completo desktop ainda muito alto: ${Math.round(advancedCalculatorHeight)}px`);
  }
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(" | ")}`);

  return {
    name: config.name,
    title,
    h1,
    cost,
    suggested,
    unitSummary,
    marginSummary,
    failureReserve,
    activeAfterMetodo,
    screenshot,
    failures,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const config of [
    { name: "desktop", viewport: { width: 1440, height: 1000 }, mobile: false },
    { name: "mobile", viewport: { width: 390, height: 844 }, mobile: true },
    { name: "mobile-compact", viewport: { width: 320, height: 700 }, mobile: true },
  ]) {
    results.push(await testViewport(browser, config));
  }

  await browser.close();

  for (const result of results) {
    console.log(
      `${result.name}: custo=${result.cost}; venda=${result.suggested}; margem=${result.marginSummary}; falha=${result.failureReserve}; nav=${result.activeAfterMetodo?.trim()}; screenshot=${result.screenshot}`
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
