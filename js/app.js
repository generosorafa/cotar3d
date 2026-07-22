const form = document.querySelector("#quoteForm");
const printerSelect = document.querySelector("#printerSelect");
const averageWatts = document.querySelector("#averageWatts");
const materialSelect = document.querySelector('select[name="material"]');
const materialKgPrice = document.querySelector('input[name="materialKgPrice"]');
const materialPriceHint = document.querySelector("#materialPriceHint");
const marginButtons = document.querySelectorAll("[data-margin]");
const marginInput = document.querySelector('input[name="marginPercent"]');
const marginCustom = document.querySelector(".margin-custom");
const advancedToggle = document.querySelector("#advancedToggle");
const advancedFields = document.querySelector("#advancedFields");
const calculatorShell = document.querySelector("#calculadora");
const calculatorTabs = document.querySelector(".calculator-tabs");
const calculatorViewButtons = document.querySelectorAll("[data-calculator-view]");
const copySummary = document.querySelector("#copySummary");
const saveDefaults = document.querySelector("#saveDefaults");
const sectionNavLinks = document.querySelectorAll("[data-nav-target]");
const openClientQuote = document.querySelector("#openClientQuote");
const clientQuoteDialog = document.querySelector("#clientQuoteDialog");
const closeClientQuote = document.querySelector("#closeClientQuote");
const copyClientQuote = document.querySelector("#copyClientQuote");
const printClientQuote = document.querySelector("#printClientQuote");
const clientQuoteSeller = document.querySelector("#clientQuoteSeller");

const output = {
  suggestedPrice: document.querySelector("#suggestedPrice"),
  mobileSuggestedPrice: document.querySelector("#mobileSuggestedPrice"),
  mobileTabPrice: document.querySelector("#mobileTabPrice"),
  materialCostPreview: document.querySelector("#materialCostPreview"),
  energyCostPreview: document.querySelector("#energyCostPreview"),
  laborCostPreview: document.querySelector("#laborCostPreview"),
  unitPriceSummary: document.querySelector("#unitPriceSummary"),
  marginSummary: document.querySelector("#marginSummary"),
  totalCost: document.querySelector("#totalCost"),
  minimumPrice: document.querySelector("#minimumPrice"),
  profitValue: document.querySelector("#profitValue"),
  wasteValue: document.querySelector("#wasteValue"),
  profitPerHour: document.querySelector("#profitPerHour"),
  healthCard: document.querySelector("#healthCard"),
  healthStatus: document.querySelector("#healthStatus"),
  breakdownList: document.querySelector("#breakdownList"),
  insightList: document.querySelector("#insightList"),
  insightDetails: document.querySelector("#insightDetails"),
  insightSummary: document.querySelector("#insightSummary"),
  copyStatus: document.querySelector("#copyStatus"),
  saveStatus: document.querySelector("#saveStatus"),
  clientQuoteJob: document.querySelector("#clientQuoteJob"),
  clientQuoteMaterial: document.querySelector("#clientQuoteMaterial"),
  clientQuoteQuantity: document.querySelector("#clientQuoteQuantity"),
  clientQuoteTotal: document.querySelector("#clientQuoteTotal"),
  clientQuoteUnit: document.querySelector("#clientQuoteUnit"),
  clientQuoteDate: document.querySelector("#clientQuoteDate"),
  clientQuoteStatus: document.querySelector("#clientQuoteStatus"),
  printerSettingsSummary: document.querySelector("#printerSettingsSummary"),
};

const localDefaultsKey = "cotar3d-defaults-v1";
const defaultFields = [
  "material",
  "materialKgPrice",
  "marginPercent",
  "printer",
  "averageWatts",
  "energyRate",
  "machineHourCost",
  "failurePercent",
  "packagingCost",
  "extraSupplies",
  "laborMinutes",
  "hourlyRate",
  "taxPercent",
  "shippingCost",
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const percentage = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const shortDate = new Intl.DateTimeFormat("pt-BR");

function numberFrom(formData, key) {
  const value = Number.parseFloat(String(formData.get(key)).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function nonNegativeFrom(formData, key) {
  return Math.max(0, numberFrom(formData, key));
}

function money(value) {
  return currency.format(Math.max(0, value));
}

function quantityLabel(quantity) {
  return `${quantity} ${quantity === 1 ? "peça" : "peças"}`;
}

function getSelectedMaterial() {
  return materialSelect.selectedOptions?.[0];
}

function updateMaterialHint() {
  const selected = getSelectedMaterial();
  const materialName = selected?.value || "material";
  const presetPrice = Number.parseFloat(selected?.dataset.price || "0");

  if (presetPrice > 0) {
    materialPriceHint.textContent = `Preço sugerido para ${materialName}. Ajuste para o valor pago.`;
  } else {
    materialPriceHint.textContent = "Informe o preço real do seu material por kg.";
  }
}

function buildInsights({
  consumedGrams,
  materialKgPriceValue,
  printHours,
  markupPercent,
  useAdvanced,
  failurePercent,
  taxPercent,
  finalPartGrams,
  profitPerHour,
  machineHourCost,
}) {
  const insights = [];

  if (consumedGrams <= 0) {
    insights.push(["danger", "Informe o consumo total exibido no slicer para evitar cotação zerada."]);
  }

  if (materialKgPriceValue <= 0) {
    insights.push(["danger", "Preço do kg está zerado. Use o valor real pago na bobina ou resina."]);
  }

  if (printHours <= 0) {
    insights.push(["warning", "Tempo de impressão zerado remove energia, desgaste e lucro por hora da análise."]);
  }

  if (!useAdvanced) {
    insights.push(["neutral", "Modo simples ativo: mão de obra, frete, taxa de falha e impostos não entram no cálculo."]);
  }

  if (useAdvanced && failurePercent === 0) {
    insights.push(["warning", "Taxa de falha zerada pode esconder perda real de material e tempo."]);
  }

  if (markupPercent < 20) {
    insights.push(["warning", "Margem sobre o custo abaixo de 20% pode ficar apertada se houver retrabalho ou negociação."]);
  }

  if (taxPercent >= 80) {
    insights.push(["danger", "Taxas/impostos muito altos elevam bastante o preço. Confira o percentual informado."]);
  } else if (taxPercent > 0) {
    insights.push(["neutral", "Taxas/impostos foram embutidos no preço sugerido e aparecem no detalhamento."]);
  }

  if (useAdvanced && finalPartGrams > consumedGrams && consumedGrams > 0) {
    insights.push(["warning", "Peso da peça pronta está maior que o consumo do slicer. Confira os campos."]);
  }

  if (printHours > 0 && profitPerHour < machineHourCost) {
    insights.push(["warning", "Lucro por hora está menor que o desgaste por hora informado. Essa peça pode ocupar a máquina por pouco retorno."]);
  }

  if (insights.length === 0) {
    insights.push(["good", "Cotação saudável para o cenário informado. Confira os valores reais antes de enviar ao cliente."]);
  }

  return insights.slice(0, 4);
}

function calculateQuote() {
  const data = new FormData(form);

  const consumedGrams = nonNegativeFrom(data, "consumedGrams");
  const materialKgPriceValue = nonNegativeFrom(data, "materialKgPrice");
  const quantity = Math.max(1, Math.floor(nonNegativeFrom(data, "quantity") || 1));
  const printHours = nonNegativeFrom(data, "printHours");
  const markupPercent = nonNegativeFrom(data, "marginPercent");
  const watts = nonNegativeFrom(data, "averageWatts");
  const energyRate = nonNegativeFrom(data, "energyRate");
  const machineHourCost = nonNegativeFrom(data, "machineHourCost");
  const useAdvanced = advancedToggle.checked;
  const failurePercent = useAdvanced ? Math.min(100, nonNegativeFrom(data, "failurePercent")) : 0;
  const packagingCost = useAdvanced ? nonNegativeFrom(data, "packagingCost") : 0;
  const extraSupplies = useAdvanced ? nonNegativeFrom(data, "extraSupplies") : 0;
  const laborMinutes = useAdvanced ? nonNegativeFrom(data, "laborMinutes") : 0;
  const hourlyRate = useAdvanced ? nonNegativeFrom(data, "hourlyRate") : 0;
  const taxPercent = useAdvanced ? Math.min(99, nonNegativeFrom(data, "taxPercent")) : 0;
  const shippingCost = useAdvanced ? nonNegativeFrom(data, "shippingCost") : 0;
  const finalPartGrams = useAdvanced ? nonNegativeFrom(data, "finalPartGrams") : 0;

  const materialCost = (consumedGrams / 1000) * materialKgPriceValue;
  const energyCost = (watts / 1000) * printHours * energyRate;
  const machineCost = printHours * machineHourCost;
  const laborCost = (laborMinutes / 60) * hourlyRate;
  const baseCost =
    materialCost +
    energyCost +
    machineCost +
    packagingCost +
    extraSupplies +
    laborCost +
    shippingCost;
  const repeatableProductionCost = materialCost + energyCost + machineCost;
  const failureCost = repeatableProductionCost * (failurePercent / 100);
  const totalCost = baseCost + failureCost;
  const minimumPrice = totalCost / (1 - taxPercent / 100);
  const markupPrice = totalCost * (1 + markupPercent / 100);
  const suggestedPrice = markupPrice / (1 - taxPercent / 100);
  const taxCost = suggestedPrice * (taxPercent / 100);
  const profitValue = suggestedPrice - totalCost - taxCost;
  const profitPerHour = printHours > 0 ? profitValue / printHours : 0;
  const realMargin = suggestedPrice > 0 ? (profitValue / suggestedPrice) * 100 : 0;
  const wasteGrams = finalPartGrams > 0 ? Math.max(0, consumedGrams - finalPartGrams) : 0;
  const unitPrice = suggestedPrice / quantity;

  output.suggestedPrice.textContent = money(suggestedPrice);
  output.mobileSuggestedPrice.textContent = money(suggestedPrice);
  output.mobileTabPrice.textContent = money(suggestedPrice);
  output.materialCostPreview.textContent = money(materialCost);
  output.energyCostPreview.textContent = money(energyCost);
  output.laborCostPreview.textContent = useAdvanced ? money(laborCost) : "Opcional";
  output.unitPriceSummary.textContent = `${quantityLabel(quantity)} · ${money(unitPrice)} por peça`;
  output.marginSummary.textContent = `Margem real no preço: ${percentage.format(realMargin)}%`;
  const printerLabel = printerSelect.selectedOptions?.[0]?.textContent
    ?.replace(/\s+-\s+estimado.*$/i, "") || "Personalizada";
  output.printerSettingsSummary.textContent = `${printerLabel} · ${Math.round(watts)} W · ${money(energyRate)}/kWh`;
  output.totalCost.textContent = money(totalCost);
  output.minimumPrice.textContent = money(minimumPrice);
  output.profitValue.textContent = money(profitValue);
  output.profitPerHour.textContent = money(profitPerHour);
  output.wasteValue.textContent = finalPartGrams > 0 ? `${wasteGrams.toFixed(1)} g` : "opcional";
  marginButtons.forEach((button) => {
    const isActive = Number(button.dataset.margin) === markupPercent;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  marginCustom.classList.toggle(
    "is-active",
    !Array.from(marginButtons).some((button) => Number(button.dataset.margin) === markupPercent)
  );
  output.healthCard.classList.remove("is-good", "is-warning", "is-danger");

  if (profitValue <= 0 || realMargin < 8) {
    output.healthStatus.textContent = "Risco";
    output.healthCard.classList.add("is-danger");
  } else if (realMargin < 20 || profitPerHour < machineHourCost) {
    output.healthStatus.textContent = "Apertado";
    output.healthCard.classList.add("is-warning");
  } else {
    output.healthStatus.textContent = "Seguro";
    output.healthCard.classList.add("is-good");
  }

  const breakdown = [
    ["Material", materialCost],
    ["Energia", energyCost],
    ["Desgaste da impressora", machineCost],
    ["Mao de obra", laborCost],
    ["Embalagem, insumos e frete", packagingCost + extraSupplies + shippingCost],
    ["Reserva para repetir impressão", failureCost],
    ["Taxas/impostos", taxCost],
  ];

  output.breakdownList.innerHTML = breakdown
    .map(([label, value]) => `<li><span>${label}</span><b>${money(value)}</b></li>`)
    .join("");

  const insights = buildInsights({
    consumedGrams,
    materialKgPriceValue,
    printHours,
    markupPercent,
    useAdvanced,
    failurePercent,
    taxPercent,
    finalPartGrams,
    profitPerHour,
    machineHourCost,
  });

  output.insightList.innerHTML = insights
    .map(([tone, text]) => `<li class="${tone}">${text}</li>`)
    .join("");

  const criticalInsights = insights.filter(([tone]) => tone === "danger").length;
  output.insightSummary.textContent = `${insights.length} ${insights.length === 1 ? "observação" : "observações"}`;

  if (criticalInsights > 0) {
    output.insightDetails.open = true;
  }

  return {
    jobName: String(data.get("jobName") || "Peça sem nome"),
    material: String(data.get("material") || "Material"),
    quantity,
    consumedGrams,
    materialCost,
    totalCost,
    minimumPrice,
    suggestedPrice,
    unitPrice,
    profitValue,
    profitPerHour,
    taxCost,
    printHours,
    markupPercent,
    realMargin,
  };
}

function syncPrinterPreset() {
  if (printerSelect.value !== "custom") {
    averageWatts.value = printerSelect.value;
  }
  calculateQuote();
}

function syncMaterialPreset() {
  const selected = getSelectedMaterial();
  const presetPrice = Number.parseFloat(selected?.dataset.price || "0");

  if (presetPrice > 0) {
    materialKgPrice.value = String(presetPrice);
  }

  updateMaterialHint();
  calculateQuote();
}

function applyMarginPreset(event) {
  const margin = event.currentTarget.dataset.margin;
  marginInput.value = margin;
  calculateQuote();
}

function setCalculatorView(view, shouldScroll = true) {
  const targetView = view === "price" ? "price" : "data";
  calculatorShell.dataset.view = targetView;

  calculatorViewButtons.forEach((button) => {
    if (!button.closest(".calculator-tabs")) return;
    button.setAttribute("aria-pressed", String(button.dataset.calculatorView === targetView));
  });

  if (shouldScroll && window.matchMedia("(max-width: 680px)").matches) {
    calculatorShell.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toggleAdvanced() {
  advancedFields.classList.toggle("is-open", advancedToggle.checked);
  calculateQuote();
}

function copyQuoteSummary() {
  const quote = calculateQuote();
  const summary = [
    `Cotacao Cotar3D - ${quote.jobName}`,
    `Material: ${quote.material}`,
    `Quantidade: ${quantityLabel(quote.quantity)}`,
    `Consumo do slicer: ${quote.consumedGrams.toFixed(1)} g`,
    `Tempo de impressao: ${quote.printHours.toFixed(1)} h`,
    `Custo real: ${money(quote.totalCost)}`,
    `Preco minimo: ${money(quote.minimumPrice)}`,
    `Preco sugerido: ${money(quote.suggestedPrice)}`,
    `Preco por peca: ${money(quote.unitPrice)}`,
    `Margem desejada sobre o custo: ${percentage.format(quote.markupPercent)}%`,
    `Margem real no preco: ${percentage.format(quote.realMargin)}%`,
    `Taxas/impostos: ${money(quote.taxCost)}`,
    `Lucro estimado: ${money(quote.profitValue)}`,
    `Lucro por hora: ${money(quote.profitPerHour)}`,
  ].join("\n");

  if (navigator.clipboard) {
    navigator.clipboard.writeText(summary).then(() => {
      const timer =
        globalThis.setTimeout ||
        (typeof window !== "undefined" ? window.setTimeout : null);

      output.copyStatus.textContent = "Resumo copiado.";
      copySummary.textContent = "Resumo copiado";

      if (timer) {
        timer(() => {
          output.copyStatus.textContent = "";
          copySummary.textContent = "Copiar análise interna";
        }, 1800);
      }
    }).catch(() => {
      output.copyStatus.textContent = "Não foi possível copiar automaticamente.";
    });
  } else {
    output.copyStatus.textContent = "Copiar automático indisponível neste navegador.";
  }
}

function saveLocalDefaults() {
  try {
    const data = new FormData(form);
    const defaults = {
      advancedEnabled: advancedToggle.checked,
    };

    defaultFields.forEach((field) => {
      defaults[field] = String(data.get(field) || "");
    });

    localStorage.setItem(localDefaultsKey, JSON.stringify(defaults));
    output.saveStatus.textContent = "Padrões salvos neste navegador.";
    const timer =
      globalThis.setTimeout ||
      (typeof window !== "undefined" ? window.setTimeout : null);

    if (timer) {
      timer(() => {
        output.saveStatus.textContent = "";
      }, 2400);
    }
  } catch {
    output.saveStatus.textContent = "Não foi possível salvar neste navegador.";
  }
}

function loadLocalDefaults() {
  try {
    const saved = JSON.parse(localStorage.getItem(localDefaultsKey) || "null");

    if (!saved) {
      updateMaterialHint();
      return;
    }

    defaultFields.forEach((field) => {
      if (saved[field] !== undefined && form.elements[field]) {
        form.elements[field].value = saved[field];
      }
    });

    advancedToggle.checked = Boolean(saved.advancedEnabled);
    updateMaterialHint();
  } catch {
    updateMaterialHint();
  }
}

function updateClientQuote() {
  const quote = calculateQuote();

  output.clientQuoteJob.textContent = quote.jobName;
  output.clientQuoteMaterial.textContent = quote.material;
  output.clientQuoteQuantity.textContent = quantityLabel(quote.quantity);
  output.clientQuoteTotal.textContent = money(quote.suggestedPrice);
  output.clientQuoteUnit.textContent = `${money(quote.unitPrice)} por peça`;
  output.clientQuoteDate.textContent = `Gerado em ${shortDate.format(new Date())}`;
  output.clientQuoteStatus.textContent = "";
  copyClientQuote.textContent = typeof navigator.share === "function"
    ? "Compartilhar orçamento"
    : "Copiar orçamento";

  return quote;
}

function showClientQuote() {
  const quote = updateClientQuote();

  if (quote.suggestedPrice <= 0) {
    output.copyStatus.textContent = "Preencha os custos antes de gerar o orçamento.";
    return;
  }

  output.copyStatus.textContent = "";

  if (typeof clientQuoteDialog.showModal === "function") {
    clientQuoteDialog.showModal();
  } else {
    clientQuoteDialog.setAttribute("open", "");
  }
}

function hideClientQuote() {
  if (typeof clientQuoteDialog.close === "function") {
    clientQuoteDialog.close();
  } else {
    clientQuoteDialog.removeAttribute("open");
  }
}

function buildClientQuoteText(quote) {
  const seller = clientQuoteSeller.value.trim();
  const lines = [
    "ORÇAMENTO DE IMPRESSÃO 3D",
    `Data: ${shortDate.format(new Date())}`,
    quote.jobName,
    `Material: ${quote.material}`,
    `Quantidade: ${quantityLabel(quote.quantity)}`,
    `Valor por peça: ${money(quote.unitPrice)}`,
    `Valor total: ${money(quote.suggestedPrice)}`,
    "Prazo, acabamento, frete e condições de pagamento devem ser confirmados antes da produção.",
  ];

  if (seller) lines.splice(2, 0, `Responsável: ${seller}`);

  return lines.join("\n");
}

async function shareClientQuoteText() {
  const quote = updateClientQuote();
  const text = buildClientQuoteText(quote);

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `Orçamento - ${quote.jobName}`,
        text,
      });
      output.clientQuoteStatus.textContent = "Orçamento compartilhado.";
    } catch (error) {
      if (error?.name !== "AbortError") {
        output.clientQuoteStatus.textContent = "Não foi possível abrir o compartilhamento.";
      }
    }
    return;
  }

  if (!navigator.clipboard) {
    output.clientQuoteStatus.textContent = "Copiar automaticamente não está disponível neste navegador.";
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    output.clientQuoteStatus.textContent = "Orçamento copiado para enviar ao cliente.";
  }).catch(() => {
    output.clientQuoteStatus.textContent = "Não foi possível copiar automaticamente.";
  });
}

function updateActiveSectionNav() {
  const currentHash = window.location.hash.replace("#", "");
  const validTargets = Array.from(sectionNavLinks, (link) => link.dataset.navTarget);
  const fallbackTarget = validTargets.includes(currentHash) ? currentHash : "calculadora";

  sectionNavLinks.forEach((link) => {
    const isActive = link.dataset.navTarget === fallbackTarget;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

form.addEventListener("input", calculateQuote);
form.addEventListener("change", calculateQuote);
printerSelect.addEventListener("change", syncPrinterPreset);
materialSelect.addEventListener("change", syncMaterialPreset);
marginButtons.forEach((button) => button.addEventListener("click", applyMarginPreset));
calculatorViewButtons.forEach((button) => {
  button.addEventListener("click", () => setCalculatorView(button.dataset.calculatorView));
});
advancedToggle.addEventListener("change", toggleAdvanced);
copySummary.addEventListener("click", copyQuoteSummary);
saveDefaults.addEventListener("click", saveLocalDefaults);
openClientQuote.addEventListener("click", showClientQuote);
closeClientQuote.addEventListener("click", hideClientQuote);
copyClientQuote.addEventListener("click", shareClientQuoteText);
printClientQuote.addEventListener("click", () => window.print());
clientQuoteDialog.addEventListener("click", (event) => {
  if (event.target === clientQuoteDialog) hideClientQuote();
});
window.addEventListener("hashchange", updateActiveSectionNav);

if ("IntersectionObserver" in window) {
  const calculatorObserver = new IntersectionObserver(
    ([entry]) => calculatorTabs.classList.toggle("is-visible", entry.isIntersecting),
    { threshold: 0.02 }
  );
  calculatorObserver.observe(calculatorShell);
}

loadLocalDefaults();
toggleAdvanced();
setCalculatorView("data", false);
calculateQuote();
updateActiveSectionNav();

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
