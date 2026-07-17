const form = document.querySelector("#quoteForm");
const printerSelect = document.querySelector("#printerSelect");
const averageWatts = document.querySelector("#averageWatts");
const materialSelect = document.querySelector('select[name="material"]');
const materialKgPrice = document.querySelector('input[name="materialKgPrice"]');
const materialPriceHint = document.querySelector("#materialPriceHint");
const marginButtons = document.querySelectorAll("[data-margin]");
const advancedToggle = document.querySelector("#advancedToggle");
const advancedFields = document.querySelector("#advancedFields");
const copySummary = document.querySelector("#copySummary");
const saveDefaults = document.querySelector("#saveDefaults");
const sectionNavLinks = document.querySelectorAll("[data-nav-target]");

const output = {
  suggestedPrice: document.querySelector("#suggestedPrice"),
  totalCost: document.querySelector("#totalCost"),
  minimumPrice: document.querySelector("#minimumPrice"),
  profitValue: document.querySelector("#profitValue"),
  wasteValue: document.querySelector("#wasteValue"),
  profitPerHour: document.querySelector("#profitPerHour"),
  healthCard: document.querySelector("#healthCard"),
  healthStatus: document.querySelector("#healthStatus"),
  breakdownList: document.querySelector("#breakdownList"),
  insightList: document.querySelector("#insightList"),
  copyStatus: document.querySelector("#copyStatus"),
  saveStatus: document.querySelector("#saveStatus"),
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

function numberFrom(formData, key) {
  const value = Number.parseFloat(String(formData.get(key)).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function money(value) {
  return currency.format(Math.max(0, value));
}

function getSelectedMaterial() {
  return materialSelect.selectedOptions?.[0];
}

function updateMaterialHint() {
  const selected = getSelectedMaterial();
  const materialName = selected?.value || "material";
  const presetPrice = Number.parseFloat(selected?.dataset.price || "0");

  if (presetPrice > 0) {
    materialPriceHint.textContent = `Preset editável para ${materialName}. Ajuste para o preço que você realmente pagou.`;
  } else {
    materialPriceHint.textContent = "Informe o preço real do seu material por kg.";
  }
}

function buildInsights({
  consumedGrams,
  materialKgPriceValue,
  printHours,
  marginPercent,
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

  if (marginPercent < 20) {
    insights.push(["warning", "Margem abaixo de 20% pode ficar apertada se houver retrabalho ou negociação."]);
  }

  if (taxPercent >= 100) {
    insights.push(["danger", "Taxas/impostos acima de 100% deixam o preço sugerido inconsistente."]);
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

  const consumedGrams = numberFrom(data, "consumedGrams");
  const materialKgPriceValue = numberFrom(data, "materialKgPrice");
  const printHours = numberFrom(data, "printHours");
  const marginPercent = numberFrom(data, "marginPercent");
  const watts = numberFrom(data, "averageWatts");
  const energyRate = numberFrom(data, "energyRate");
  const machineHourCost = numberFrom(data, "machineHourCost");
  const useAdvanced = advancedToggle.checked;
  const failurePercent = useAdvanced ? numberFrom(data, "failurePercent") : 0;
  const packagingCost = useAdvanced ? numberFrom(data, "packagingCost") : 0;
  const extraSupplies = useAdvanced ? numberFrom(data, "extraSupplies") : 0;
  const laborMinutes = useAdvanced ? numberFrom(data, "laborMinutes") : 0;
  const hourlyRate = useAdvanced ? numberFrom(data, "hourlyRate") : 0;
  const taxPercent = useAdvanced ? numberFrom(data, "taxPercent") : 0;
  const shippingCost = useAdvanced ? numberFrom(data, "shippingCost") : 0;
  const finalPartGrams = useAdvanced ? numberFrom(data, "finalPartGrams") : 0;

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
  const failureCost = baseCost * (failurePercent / 100);
  const totalCost = baseCost + failureCost;
  const minimumPrice = totalCost;
  const marginPrice = totalCost * (1 + marginPercent / 100);
  const suggestedPrice = taxPercent >= 100 ? marginPrice : marginPrice / (1 - taxPercent / 100);
  const taxCost = suggestedPrice * (taxPercent / 100);
  const profitValue = suggestedPrice - totalCost - taxCost;
  const profitPerHour = printHours > 0 ? profitValue / printHours : 0;
  const realMargin = suggestedPrice > 0 ? (profitValue / suggestedPrice) * 100 : 0;
  const wasteGrams = finalPartGrams > 0 ? Math.max(0, consumedGrams - finalPartGrams) : 0;

  output.suggestedPrice.textContent = money(suggestedPrice);
  output.totalCost.textContent = money(totalCost);
  output.minimumPrice.textContent = money(minimumPrice);
  output.profitValue.textContent = money(profitValue);
  output.profitPerHour.textContent = money(profitPerHour);
  output.wasteValue.textContent = finalPartGrams > 0 ? `${wasteGrams.toFixed(1)} g` : "opcional";
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
    ["Reserva por falha", failureCost],
    ["Taxas/impostos", taxCost],
  ];

  output.breakdownList.innerHTML = breakdown
    .map(([label, value]) => `<li><span>${label}</span><b>${money(value)}</b></li>`)
    .join("");

  const insights = buildInsights({
    consumedGrams,
    materialKgPriceValue,
    printHours,
    marginPercent,
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

  return {
    jobName: String(data.get("jobName") || "Peca sem nome"),
    material: String(data.get("material") || "Material"),
    consumedGrams,
    materialCost,
    totalCost,
    minimumPrice,
    suggestedPrice,
    profitValue,
    profitPerHour,
    taxCost,
    printHours,
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
  form.elements.marginPercent.value = margin;
  calculateQuote();
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
    `Consumo do slicer: ${quote.consumedGrams.toFixed(1)} g`,
    `Tempo de impressao: ${quote.printHours.toFixed(1)} h`,
    `Custo real: ${money(quote.totalCost)}`,
    `Preco minimo: ${money(quote.minimumPrice)}`,
    `Preco sugerido: ${money(quote.suggestedPrice)}`,
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
          copySummary.textContent = "Copiar resumo";
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
advancedToggle.addEventListener("change", toggleAdvanced);
copySummary.addEventListener("click", copyQuoteSummary);
saveDefaults.addEventListener("click", saveLocalDefaults);
window.addEventListener("hashchange", updateActiveSectionNav);

loadLocalDefaults();
toggleAdvanced();
calculateQuote();
updateActiveSectionNav();
