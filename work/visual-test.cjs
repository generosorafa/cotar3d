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
  const themeToggle = page.locator("[data-theme-toggle]");
  await themeToggle.click();
  const darkThemeApplied = await page.locator("html").getAttribute("data-theme") === "dark";
  const darkThemeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
  const darkScreenshot = config.name === "desktop"
    ? path.join(outputDir, "cotar3d-desktop-escuro.png")
    : null;
  if (darkScreenshot) await page.screenshot({ path: darkScreenshot, fullPage: true });
  await themeToggle.click();
  const lightThemeRestored = await page.locator("html").getAttribute("data-theme") === "light";

  await page.locator("#quoteForm").waitFor({ state: "visible", timeout: 15000 });
  const settingsClosedByDefault = !(await page.locator(".settings-details").evaluate((element) => element.open));
  await page.locator(".settings-details summary").click();
  const printerPresetCount = await page.locator("[data-printer-preset]").count();
  await page.locator('[data-printer-preset="95"]').click();
  const printerPresetApplied =
    (await page.locator("#printerSelect").inputValue()) === "95" &&
    (await page.locator("#averageWatts").inputValue()) === "95" &&
    (await page.locator('[data-printer-preset="95"]').getAttribute("aria-pressed")) === "true";
  await page.locator("#averageWatts").fill("111");
  const customWattsApplied =
    (await page.locator("#printerSelect").inputValue()) === "custom" &&
    (await page.locator('[data-printer-preset="custom"]').getAttribute("aria-pressed")) === "true";
  await page.locator('[data-printer-preset="145"]').click();
  if (config.name === "desktop" || config.name === "mobile") {
    await page.locator(".settings-details").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(outputDir, `cotar3d-impressoras-${config.name}.png`) });
  }
  await page.locator('[name="materialKgPrice"]').fill("95");
  await page.locator('[name="consumedGrams"]').fill("120");
  await page.locator('[name="printHours"]').fill("8");
  await page.locator('[name="energyRate"]').fill("0.95");
  await page.locator('[name="marginPercent"]').fill("45");
  await page.locator('[name="quantity"]').fill("4");
  await page.locator(".settings-details summary").click();

  const materialPreview = await page.locator("#materialCostPreview").innerText();
  const energyPreview = await page.locator("#energyCostPreview").innerText();
  const activeMargin = await page.locator('[data-margin][aria-pressed="true"]').innerText();
  const alertsClosedByDefault = !(await page.locator("#insightDetails").evaluate((element) => element.open));
  const mobilePriceStripDisplay = await page.locator(".mobile-price-strip").evaluate((element) => {
    return getComputedStyle(element).display;
  });
  const layoutMetrics = await page.evaluate(() => ({
    calculatorTop: document.querySelector("#calculadora").getBoundingClientRect().top + scrollY,
    problemTop: document.querySelector("#problema").getBoundingClientRect().top + scrollY,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    calculatorHeight: document.querySelector("#quoteForm").getBoundingClientRect().height,
    primaryColumns: getComputedStyle(document.querySelector("#quoteForm fieldset .field-grid"))
      .gridTemplateColumns.trim().split(/\s+/).length,
    primaryLabelColumns: getComputedStyle(document.querySelector("#quoteForm fieldset .field-grid label"))
      .gridTemplateColumns.trim().split(/\s+/).length,
    themeToggleSize: Math.min(
      document.querySelector("[data-theme-toggle]").getBoundingClientRect().width,
      document.querySelector("[data-theme-toggle]").getBoundingClientRect().height
    ),
    smallestNavTarget: Math.min(
      ...Array.from(document.querySelectorAll(".nav a"), (link) => link.getBoundingClientRect().height)
    ),
  }));

  const dataViewStarted = !config.mobile || await page.locator("#quoteForm").isVisible();
  if (config.name === "mobile") {
    await page.locator("#calculadora").scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outputDir, "cotar3d-mobile-dados.png") });
  }
  if (config.mobile) {
    await page.locator(".mobile-price-strip").click();
    await page.locator("#quoteResults").waitFor({ state: "visible" });
    if (config.name === "mobile") {
      await page.screenshot({ path: path.join(outputDir, "cotar3d-mobile-preco.png") });
    }
  }

  const priceViewOpened = await page.locator("#quoteResults").isVisible();
  const cost = await page.locator("#totalCost").innerText();
  const suggested = await page.locator("#suggestedPrice").innerText();
  const unitSummary = await page.locator("#unitPriceSummary").innerText();
  const marginSummary = await page.locator("#marginSummary").innerText();
  layoutMetrics.resultHeight = await page.locator("#quoteResults").evaluate((element) => {
    return element.getBoundingClientRect().height;
  });
  layoutMetrics.resultColumns = await page.locator("#quoteResults .result-grid").evaluate((element) => {
    const columns = Array.from(element.children, (child) => Math.round(child.getBoundingClientRect().left));
    return new Set(columns).size;
  });

  let expandedDetailsContained = true;
  let expandedDetailsClearAlerts = true;
  let expandedAlertsContained = true;

  if (config.mobile) {
    const resultDetails = page.locator(".result-secondary .result-details");
    const resultDetailCount = await resultDetails.count();

    for (let index = 0; index < resultDetailCount; index += 1) {
      await resultDetails.nth(index).locator("summary").click();
    }

    const insightDetails = page.locator("#insightDetails");
    const insightsWereOpen = await insightDetails.evaluate((element) => element.open);
    if (!insightsWereOpen) await insightDetails.locator("summary").click();

    const expandedMetrics = await page.locator("#quoteResults").evaluate((panel) => {
      const secondary = panel.querySelector(".result-secondary");
      const alerts = panel.querySelector("#insightDetails");
      const alertContent = alerts.querySelector(":scope > div");
      const actions = panel.querySelector(".result-actions");
      const details = Array.from(secondary.querySelectorAll(".result-details[open]"));

      return {
        contained: details.every((detail) => {
          const content = detail.querySelector(":scope > div");
          return content && content.getBoundingClientRect().bottom <= detail.getBoundingClientRect().bottom + 1;
        }),
        clearAlerts: secondary.getBoundingClientRect().bottom <= alerts.getBoundingClientRect().top + 1,
        alertsContained:
          alertContent.getBoundingClientRect().bottom <= alerts.getBoundingClientRect().bottom + 1 &&
          alerts.getBoundingClientRect().bottom <= actions.getBoundingClientRect().top + 1,
      };
    });

    expandedDetailsContained = expandedMetrics.contained;
    expandedDetailsClearAlerts = expandedMetrics.clearAlerts;
    expandedAlertsContained = expandedMetrics.alertsContained;
    layoutMetrics.openResultPanels = await page.locator("#quoteResults details[open]").count();

    if (config.name === "mobile") {
      await page.locator(".result-secondary").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(outputDir, "cotar3d-mobile-detalhes-abertos.png") });
    }

    const openResultPanel = page.locator("#quoteResults details[open]");
    if (await openResultPanel.count()) await openResultPanel.first().locator("summary").click();
  }

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

  if (config.mobile) {
    await page.locator('.calculator-tabs [data-calculator-view="data"]').evaluate((button) => button.click());
    await page.locator("#quoteForm").waitFor({ state: "visible" });
  }

  await page.evaluate(() => {
    const toggle = document.querySelector("#advancedToggle");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const costGroups = page.locator(".cost-group");
  const costGroupCount = await costGroups.count();
  const costGroupsClosedByDefault = (await page.locator(".cost-group[open]").count()) === 0;
  await page.locator('[name="consumedGrams"]').fill("1000");
  await page.locator('[name="materialKgPrice"]').fill("100");
  await page.locator('[name="printHours"]').fill("0");
  await costGroups.nth(0).locator("summary").click();
  await page.locator('[name="failurePercent"]').fill("10");
  await page.locator('[name="packagingCost"]').fill("100");
  await page.locator('[name="extraSupplies"]').fill("100");
  await costGroups.nth(1).locator("summary").click();
  const firstCostGroupClosed = !(await costGroups.nth(0).evaluate((element) => element.open));
  await page.locator('[name="laborMinutes"]').fill("0");
  await page.locator('[name="hourlyRate"]').fill("30");
  await costGroups.nth(2).locator("summary").click();
  const costGroupsExclusive = firstCostGroupClosed && (await page.locator(".cost-group[open]").count()) === 1;
  await page.locator('[name="taxPercent"]').fill("10");
  await page.locator('[name="shippingCost"]').fill("100");
  await page.locator('[name="marginPercent"]').fill("0");
  const progressiveSummaries = [
    await page.locator("#lossSettingsSummary").innerText(),
    await page.locator("#laborSettingsSummary").innerText(),
    await page.locator("#salesSettingsSummary").innerText(),
  ];
  const failureReserve = (await page.locator("#breakdownList li").filter({
    hasText: "Reserva para repetir impressão",
  }).textContent()).replace(/\s/g, " ");
  const advancedCalculatorHeight = await page.locator("#quoteForm").evaluate((element) => {
    return element.getBoundingClientRect().height;
  });
  const minimumWithTax = await page.locator("#minimumPrice").textContent();
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

  await page.locator("#resetQuote").click();
  const resetState = await page.evaluate(() => ({
    jobName: document.querySelector('[name="jobName"]').value,
    quantity: document.querySelector('[name="quantity"]').value,
    consumedGrams: document.querySelector('[name="consumedGrams"]').value,
    printHours: document.querySelector('[name="printHours"]').value,
    view: document.querySelector("#calculadora").dataset.view,
    openCostGroups: document.querySelectorAll(".cost-group[open]").length,
  }));

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
  if (printerPresetCount !== 6 || !printerPresetApplied || !customWattsApplied) {
    failures.push("seleção visual de impressora ou watts personalizados não sincronizou");
  }
  if (!darkThemeApplied || darkThemeColor !== "#0e1715" || !lightThemeRestored) {
    failures.push("alternância de tema não atualizou interface e cor do navegador");
  }
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
  if (!activeMargin.includes("45%")) failures.push(`preset de margem não ficou ativo: ${activeMargin}`);
  if (!materialPreview.replace(/\s/g, " ").includes("R$ 11,40") || !energyPreview.includes("R$")) {
    failures.push(`prévias de custo inesperadas: material=${materialPreview}; energia=${energyPreview}`);
  }
  if (!failureReserve.includes("R$ 10,00")) failures.push(`reserva de falha inesperada: ${failureReserve}`);
  if (!minimumWithTax.replace(/\s/g, " ").includes("R$ 455,56")) failures.push(`preço mínimo com imposto inesperado: ${minimumWithTax}`);
  if (layoutMetrics.horizontalOverflow > 1) {
    failures.push(`pagina com overflow horizontal de ${layoutMetrics.horizontalOverflow}px`);
  }
  if (config.mobile && layoutMetrics.calculatorTop >= layoutMetrics.problemTop) {
    failures.push("calculadora deveria vir antes do conteudo explicativo no celular");
  }
  if (config.mobile && mobilePriceStripDisplay === "none") failures.push("atalho de resultado nao apareceu no celular");
  if (!config.mobile && mobilePriceStripDisplay !== "none") failures.push("atalho de resultado apareceu no desktop");
  if (!dataViewStarted || !priceViewOpened) failures.push("navegação Dados/Preço não abriu as duas etapas");
  if (!expandedDetailsContained || !expandedDetailsClearAlerts || !expandedAlertsContained) {
    failures.push("detalhes abertos escaparam do próprio bloco ou sobrepuseram os alertas");
  }
  if (config.mobile && layoutMetrics.openResultPanels !== 1) {
    failures.push(`acordeões mobile permitiram ${layoutMetrics.openResultPanels} painéis abertos`);
  }
  if (costGroupCount !== 3 || !costGroupsClosedByDefault || !costGroupsExclusive) {
    failures.push("grupos de custos opcionais não funcionaram de forma progressiva");
  }
  if (!progressiveSummaries[0].includes("10,0%") || !progressiveSummaries[2].includes("10,0%")) {
    failures.push(`resumos dos custos não atualizaram: ${progressiveSummaries.join(" | ")}`);
  }
  if (
    resetState.jobName !== "" ||
    resetState.quantity !== "1" ||
    resetState.consumedGrams !== "0" ||
    resetState.printHours !== "0" ||
    resetState.view !== "data" ||
    resetState.openCostGroups !== 0
  ) {
    failures.push(`nova cotação não reiniciou corretamente: ${JSON.stringify(resetState)}`);
  }
  if (config.mobile && (layoutMetrics.themeToggleSize < 44 || layoutMetrics.smallestNavTarget < 44)) {
    failures.push(`alvos de toque pequenos: tema=${layoutMetrics.themeToggleSize}; menu=${layoutMetrics.smallestNavTarget}`);
  }
  if (!config.mobile && layoutMetrics.primaryColumns !== 3) {
    failures.push(`formulario desktop com ${layoutMetrics.primaryColumns} colunas`);
  }
  if (config.mobile && config.viewport.width > 350 && layoutMetrics.primaryLabelColumns !== 2) {
    failures.push(`campos mobile sem respostas laterais: ${layoutMetrics.primaryLabelColumns} colunas`);
  }
  if (config.mobile && config.viewport.width <= 350 && layoutMetrics.primaryLabelColumns !== 1) {
    failures.push(`campos estreitos deveriam voltar para uma coluna`);
  }
  const expectedResultColumns = config.mobile && config.viewport.width <= 350 ? 1 : 2;
  if (layoutMetrics.resultColumns !== expectedResultColumns) {
    failures.push(`grade de resultados com ${layoutMetrics.resultColumns} colunas`);
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
    minimumWithTax,
    failureReserve,
    layoutMetrics,
    activeAfterMetodo,
    screenshot,
    failures,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const secondaryFailures = [];

  for (const config of [
    { name: "desktop", viewport: { width: 1440, height: 1000 }, mobile: false },
    { name: "mobile-wide", viewport: { width: 430, height: 932 }, mobile: true },
    { name: "mobile", viewport: { width: 390, height: 844 }, mobile: true },
    { name: "mobile-compact", viewport: { width: 320, height: 700 }, mobile: true },
  ]) {
    results.push(await testViewport(browser, config));
  }

  for (const file of [
    "como-calcular-preco-impressao-3d.html",
    "politica-de-privacidade.html",
    "termos-de-uso.html",
    "404.html",
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(new URL(file, siteUrl).href, { waitUntil: "networkidle", timeout: 45000 });
    const toggle = page.locator("[data-theme-toggle]");
    const toggleCount = await toggle.count();

    if (toggleCount === 1) await toggle.click();
    const theme = await page.locator("html").getAttribute("data-theme");
    if (toggleCount !== 1 || theme !== "dark" || errors.length) {
      secondaryFailures.push(`${file}: tema=${theme}; botões=${toggleCount}; erros=${errors.join(" | ")}`);
    }

    await page.close();
  }

  await browser.close();

  for (const result of results) {
    console.log(
      `${result.name}: custo=${result.cost}; venda=${result.suggested}; margem=${result.marginSummary}; formulario=${Math.round(result.layoutMetrics.calculatorHeight)}px; resultado=${Math.round(result.layoutMetrics.resultHeight)}px; nav=${result.activeAfterMetodo?.trim()}; screenshot=${result.screenshot}`
    );
    if (result.failures.length) {
      for (const failure of result.failures) console.error(`- ${result.name}: ${failure}`);
    }
  }

  for (const failure of secondaryFailures) console.error(`- página secundária: ${failure}`);

  if (results.some((result) => result.failures.length) || secondaryFailures.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
