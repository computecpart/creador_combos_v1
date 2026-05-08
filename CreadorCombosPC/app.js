(function () {
  "use strict";

  var catalog = window.PC_CATALOG || { categories: {}, products: [], audit: {} };
  var products = catalog.products || [];
  var discountRates = [0, 10, 15, 20, 25];
  var whatsappNumber = "50377445204";
  enhanceCompatibilityData();
  var categories = Object.keys(catalog.categories || {}).map(function (id) {
    return Object.assign({ id: id }, catalog.categories[id]);
  });
  var productById = new Map(products.map(function (product) {
    return [product.id, product];
  }));
  var productByCode = new Map(products.map(function (product) {
    return [String(product.code), product];
  }));
  var currency = new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: catalog.currency || "USD"
  });
  var smokeMode = new URLSearchParams(window.location.search).has("smoke");
  var storageKey = "pc-combo-builder-state-v1";
  var themeKey = "pc-combo-builder-theme-v1";

  var dom = {
    catalogCount: document.getElementById("catalogCount"),
    coreCount: document.getElementById("coreCount"),
    buildStatus: document.getElementById("buildStatus"),
    sourceLabel: document.getElementById("sourceLabel"),
    buildOverview: document.getElementById("buildOverview"),
    categoryRail: document.getElementById("categoryRail"),
    activeCategoryMeta: document.getElementById("activeCategoryMeta"),
    activeCategoryTitle: document.getElementById("activeCategoryTitle"),
    categoryProgress: document.getElementById("categoryProgress"),
    searchInput: document.getElementById("searchInput"),
    brandFilter: document.getElementById("brandFilter"),
    sortFilter: document.getElementById("sortFilter"),
    insightBar: document.getElementById("insightBar"),
    productGrid: document.getElementById("productGrid"),
    quoteId: document.getElementById("quoteId"),
    healthPill: document.getElementById("healthPill"),
    selectionList: document.getElementById("selectionList"),
    diagnosticList: document.getElementById("diagnosticList"),
    clientName: document.getElementById("clientName"),
    clientContact: document.getElementById("clientContact"),
    clientEmail: document.getElementById("clientEmail"),
    validDays: document.getElementById("validDays"),
    quoteNotes: document.getElementById("quoteNotes"),
    totalBox: document.getElementById("totalBox"),
    sendWhatsapp: document.getElementById("sendWhatsapp"),
    downloadQuote: document.getElementById("downloadQuote"),
    printQuote: document.getElementById("printQuote"),
    downloadCsv: document.getElementById("downloadCsv"),
    copySummary: document.getElementById("copySummary"),
    resetBuilder: document.getElementById("resetBuilder"),
    themeToggle: document.getElementById("themeToggle"),
    productDialog: document.getElementById("productDialog"),
    closeDialog: document.getElementById("closeDialog"),
    dialogBody: document.getElementById("dialogBody")
  };

  var presets = {
    office: [
      { code: "2206" },
      { code: "3431" },
      { code: "17008" },
      { code: "21261" },
      { code: "4159" },
      { code: "3465" },
      { code: "5702" }
    ],
    gaming: [
      { code: "2247" },
      { code: "3170" },
      { code: "22178" },
      { code: "21262" },
      { code: "3766" },
      { code: "37103" },
      { code: "4162" },
      { code: "3192" },
      { code: "3467" }
    ],
    creator: [
      { code: "2970" },
      { code: "22366" },
      { code: "21543" },
      { code: "21639" },
      { code: "4174" },
      { code: "2627" },
      { code: "4164" },
      { code: "43111" },
      { code: "4472" }
    ]
  };

  var state = loadState();

  init();

  function enhanceCompatibilityData() {
    products.forEach(function (product) {
      var name = normalizeSearch(product.name);
      product.specs = product.specs || {};

      if (product.category === "psu") {
        product.specs.psuFormFactor = product.specs.psuFormFactor || "ATX";
      }

      if (product.category === "case") {
        product.specs.psuSupport = product.specs.psuSupport || ["ATX"];
        if (name.includes("o11 dynamic") || name.includes("011 dynamic")) {
          product.specs.supportedMotherboards = ["ATX", "Micro ATX", "Mini ITX"];
          product.specs.psuSupport = ["SFX", "SFX-L"];
        }
        if (name.includes("nr200p")) {
          product.specs.supportedMotherboards = ["Mini ITX"];
          product.specs.psuSupport = ["SFX", "SFX-L"];
        }
        if (name.includes("s100 tg") || name.includes("elite 301") || name.includes("pano m100") || name.includes("shield m301") || name.includes("m110a")) {
          product.specs.formFactor = "Micro ATX";
          product.specs.supportedMotherboards = ["Micro ATX", "Mini ITX"];
        }
        product.tags = rebuildTags(product);
      }

      if (product.category === "motherboard") {
        if (name.includes("z790m-itx")) {
          product.specs.formFactor = "Mini ITX";
        } else if (/\b(a520m|a620m|b550m|b650m|b760m|b840m|b860m|h610m|h810m)\b/.test(name) || name.includes("micro atx") || name.includes("matx")) {
          product.specs.formFactor = "Micro ATX";
        } else if (name.includes(" atx ") || name.includes("z790") || name.includes("z890") || name.includes("b840-plus") || name.includes("pro rs")) {
          product.specs.formFactor = "ATX";
        }
        product.tags = rebuildTags(product);
      }
    });
  }

  function rebuildTags(product) {
    var specs = product.specs || {};
    if (product.category === "case") {
      var tags = [];
      if (specs.supportedMotherboards && specs.supportedMotherboards.length) {
        tags.push(specs.supportedMotherboards.join(" / "));
      } else if (specs.formFactor) {
        tags.push(specs.formFactor);
      }
      if (specs.psuSupport && specs.psuSupport.length && specs.psuSupport.indexOf("ATX") < 0) {
        tags.push("PSU " + specs.psuSupport.join("/"));
      }
      if (specs.includedPsuW) {
        tags.push("Fuente " + specs.includedPsuW + "W");
      }
      if (specs.rgb) {
        tags.push("RGB");
      }
      if (specs.glass) {
        tags.push("Vidrio");
      }
      return tags.slice(0, 6);
    }

    if (product.category === "motherboard") {
      return [specs.socket, specs.memoryType, specs.chipset, specs.formFactor, specs.wifi ? "WiFi" : ""].filter(Boolean).slice(0, 6);
    }

    return product.tags || [];
  }

  function freshState() {
    return {
      activeCategory: "cpu",
      query: "",
      brand: "",
      sort: "recommended",
      selections: {},
      quote: {
        id: createQuoteId(),
        clientName: "",
        clientContact: "",
        clientEmail: "",
        validDays: 7,
        notes: ""
      }
    };
  }

  function loadState() {
    if (smokeMode) {
      return freshState();
    }

    try {
      var raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return freshState();
      }

      var parsed = JSON.parse(raw);
      var base = freshState();
      parsed.quote = Object.assign(base.quote, parsed.quote || {});
      parsed.selections = pruneSelections(parsed.selections || {});
      return Object.assign(base, parsed);
    } catch (error) {
      return freshState();
    }
  }

  function saveState() {
    if (smokeMode) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      // Local files can run with storage disabled in some browsers.
    }
  }

  function pruneSelections(selectionMap) {
    var clean = {};
    Object.keys(selectionMap).forEach(function (category) {
      Object.keys(selectionMap[category] || {}).forEach(function (id) {
        if (!productById.has(id)) {
          return;
        }
        if (!clean[category]) {
          clean[category] = {};
        }
        clean[category][id] = Math.max(1, Number(selectionMap[category][id]) || 1);
      });
    });
    return clean;
  }

  function init() {
    hydrateTheme();
    bindEvents();
    render();

    if (smokeMode) {
      runSmokeTests();
    }
  }

  function bindEvents() {
    dom.categoryRail.addEventListener("click", function (event) {
      var button = event.target.closest("[data-category]");
      if (!button) {
        return;
      }
      state.activeCategory = button.dataset.category;
      state.brand = "";
      state.query = "";
      dom.searchInput.value = "";
      saveState();
      render();
    });

    dom.searchInput.addEventListener("input", function () {
      state.query = dom.searchInput.value.trim();
      renderGrid();
      saveState();
    });

    dom.brandFilter.addEventListener("change", function () {
      state.brand = dom.brandFilter.value;
      renderGrid();
      saveState();
    });

    dom.sortFilter.addEventListener("change", function () {
      state.sort = dom.sortFilter.value;
      renderGrid();
      saveState();
    });

    dom.productGrid.addEventListener("click", function (event) {
      var selectButton = event.target.closest("[data-select]");
      var detailButton = event.target.closest("[data-detail]");
      if (selectButton) {
        toggleProduct(selectButton.dataset.select);
      }
      if (detailButton) {
        openProductDialog(detailButton.dataset.detail);
      }
    });

    dom.selectionList.addEventListener("click", function (event) {
      var button = event.target.closest("[data-qty]");
      if (!button) {
        return;
      }
      changeQuantity(button.dataset.id, Number(button.dataset.qty));
    });

    document.querySelectorAll("[data-preset]").forEach(function (button) {
      button.addEventListener("click", function () {
        applyPreset(button.dataset.preset);
      });
    });

    [
      ["clientName", "clientName"],
      ["clientContact", "clientContact"],
      ["clientEmail", "clientEmail"],
      ["validDays", "validDays"],
      ["quoteNotes", "notes"]
    ].forEach(function (pair) {
      dom[pair[0]].addEventListener("input", function () {
        var value = dom[pair[0]].value;
        if (pair[1] === "validDays") {
          value = Math.max(0, Number(value) || 0);
        }
        state.quote[pair[1]] = value;
        renderQuote();
        saveState();
      });
    });

    dom.downloadQuote.addEventListener("click", function () {
      downloadQuoteHtml();
    });

    dom.sendWhatsapp.addEventListener("click", function () {
      sendWhatsappQuote();
    });

    dom.printQuote.addEventListener("click", function () {
      printQuote();
    });

    dom.downloadCsv.addEventListener("click", function () {
      downloadCsv();
    });

    dom.copySummary.addEventListener("click", function () {
      copySummary();
    });

    dom.resetBuilder.addEventListener("click", function () {
      state = freshState();
      saveState();
      syncForm();
      render();
      toast("Configurador limpio.");
    });

    dom.themeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark");
      if (!smokeMode) {
        window.localStorage.setItem(themeKey, document.body.classList.contains("dark") ? "dark" : "light");
      }
    });

    dom.closeDialog.addEventListener("click", closeProductDialog);
    dom.dialogBody.addEventListener("click", function (event) {
      var button = event.target.closest("[data-dialog-select]");
      if (button) {
        toggleProduct(button.dataset.dialogSelect);
        closeProductDialog();
      }
    });
  }

  function hydrateTheme() {
    try {
      if (window.localStorage.getItem(themeKey) === "dark") {
        document.body.classList.add("dark");
      }
    } catch (error) {
      return;
    }
  }

  function render() {
    syncForm();
    renderStats();
    renderCategoryRail();
    renderBuildOverview();
    renderToolbar();
    renderGrid();
    renderQuote();
  }

  function syncForm() {
    dom.searchInput.value = state.query || "";
    dom.sortFilter.value = state.sort || "recommended";
    dom.clientName.value = state.quote.clientName || "";
    dom.clientContact.value = state.quote.clientContact || "";
    dom.clientEmail.value = state.quote.clientEmail || "";
    dom.validDays.value = numberInput(state.quote.validDays || 7);
    dom.quoteNotes.value = state.quote.notes || "";
  }

  function renderStats() {
    var baseCategories = ["cpu", "motherboard", "ram", "storage", "gpu", "case", "psu", "cooling"];
    var coreCount = products.filter(function (product) {
      return baseCategories.indexOf(product.category) >= 0;
    }).length;
    var analysis = analyzeBuild();
    dom.catalogCount.textContent = String(catalog.audit.filteredProducts || products.length);
    dom.coreCount.textContent = String(coreCount);
    dom.buildStatus.textContent = analysis.label;
    dom.sourceLabel.textContent = "Inventario · " + formatCatalogDate(catalog.generatedAt);
    dom.sourceLabel.title = catalog.sourceFile || "Inventario";
  }

  function renderCategoryRail() {
    dom.categoryRail.innerHTML = categories.map(function (category) {
      var selectedCount = getCategoryEntries(category.id).reduce(function (sum, entry) {
        return sum + entry.qty;
      }, 0);
      var active = category.id === state.activeCategory ? " active" : "";
      var complete = selectedCount > 0 ? " complete" : "";
      var required = category.required ? "Requerido" : "Opcional";
      var status = selectedCount > 0 ? "✓" : category.required ? "!" : "";
      return [
        '<button class="category-button' + active + complete + '" type="button" data-category="' + escapeHtml(category.id) + '">',
        '<span class="category-icon" aria-hidden="true">' + escapeHtml(category.short) + "</span>",
        '<span class="category-text">',
        '<span class="category-title">' + escapeHtml(category.title) + "</span>",
        '<span class="category-count">' + category.count + " productos · " + required + "</span>",
        "</span>",
        '<span class="category-status" aria-hidden="true">' + status + "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderBuildOverview() {
    var slots = ["cpu", "motherboard", "ram", "storage", "gpu", "case", "psu", "cooling", "monitor"];
    dom.buildOverview.innerHTML = slots.map(function (categoryId) {
      var category = categoryById(categoryId);
      var entries = getCategoryEntries(categoryId);
      var label = entries.length ? entries.map(function (entry) {
        return entry.qty > 1 ? entry.qty + " x " + shortProductName(entry.product) : shortProductName(entry.product);
      }).join(" + ") : (category.required ? "Pendiente" : "Opcional");
      var classes = "build-slot" + (categoryId === state.activeCategory ? " active" : "") + (entries.length ? " complete" : "");
      return [
        '<div class="' + classes + '">',
        '<div class="build-slot-label"><span>' + escapeHtml(category.title) + '</span><span>' + escapeHtml(category.short) + "</span></div>",
        '<div class="build-slot-value">' + escapeHtml(label) + "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderToolbar() {
    var category = getActiveCategory();
    var selectedCount = getCategoryEntries(category.id).reduce(function (sum, entry) {
      return sum + entry.qty;
    }, 0);
    var available = products.filter(function (product) {
      return product.category === category.id && productCompatibility(product).level !== "blocked";
    });
    var brands = Array.from(new Set(available.map(function (product) {
      return product.brand;
    }).filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b, "es");
    });

    if (state.brand && brands.indexOf(state.brand) < 0) {
      state.brand = "";
    }

    dom.activeCategoryMeta.textContent = category.required ? "Paso requerido" : "Opcional";
    dom.activeCategoryTitle.textContent = category.title;
    dom.categoryProgress.textContent = selectedCount ? selectedCount + " seleccionado(s)" : category.description;
    dom.brandFilter.innerHTML = '<option value="">Todas</option>' + brands.map(function (brand) {
      return '<option value="' + escapeHtml(brand) + '"' + (state.brand === brand ? " selected" : "") + ">" + escapeHtml(brand) + "</option>";
    }).join("");
  }

  function renderGrid() {
    var category = getActiveCategory();
    var query = normalizeSearch(state.query || "");
    var list = products.filter(function (product) {
      if (product.category !== category.id) {
        return false;
      }
      if (state.brand && product.brand !== state.brand) {
        return false;
      }
      if (query && !productSearchText(product).includes(query)) {
        return false;
      }
      if (productCompatibility(product).level === "blocked") {
        return false;
      }
      return true;
    });

    list.sort(productSorter(state.sort));
    renderInsightBar(category, list);

    if (!list.length) {
      dom.productGrid.innerHTML = '<div class="empty-state">No hay productos que coincidan con los filtros actuales.</div>';
      return;
    }

    dom.productGrid.innerHTML = list.map(renderProductCard).join("");
  }

  function renderInsightBar(category, list) {
    var tokens = [];
    var current = getCategoryEntries(category.id);
    tokens.push(list.length + " visibles");
    if (current.length) {
      tokens.push(current.reduce(function (sum, entry) { return sum + entry.qty; }, 0) + " en la cotización");
    }
    var stock = list.reduce(function (sum, product) { return sum + Number(product.stock || 0); }, 0);
    tokens.push(stock + " unidades disponibles");

    var guidance = category.id === "motherboard" ? "Solo placas compatibles con CPU, RAM y gabinete seleccionados."
      : category.id === "psu" ? "Solo fuentes válidas por consumo estimado y soporte del gabinete."
      : category.id === "ram" ? "Solo memorias DIMM compatibles con el DDR de la placa elegida."
      : category.id === "case" ? "Solo gabinetes compatibles con el formato de tarjeta madre elegido."
      : category.id === "gpu" ? "La GPU recalcula fuente recomendada y balance CPU/GPU."
      : "Solo se muestran productos compatibles con la selección actual.";

    dom.insightBar.innerHTML = '<span>' + escapeHtml(guidance) + '</span>' + tokens.map(function (token) {
      return '<span class="insight-token">' + escapeHtml(token) + "</span>";
    }).join("");
  }

  function renderProductCard(product) {
    var compat = productCompatibility(product);
    var selected = isSelected(product.id);
    var category = categoryById(product.category);
    var statusText = compat.shortLabel;
    var cardClass = "product-card " + compat.level + (selected ? " selected" : "");
    var tags = (product.tags || []).map(function (tag) {
      return '<span class="tag">' + escapeHtml(tag) + "</span>";
    }).join("");
    var actionText = selected ? "Seleccionado" : category.multiple ? "Agregar" : "Elegir";

    return [
      '<article class="' + cardClass + '">',
      '<div class="product-media" data-label="' + escapeHtml(category.short) + '">',
      '<img loading="lazy" src="' + escapeAttribute(product.image) + '" alt="' + escapeAttribute(product.name) + '" onerror="this.remove(); this.parentElement.classList.add(\'image-fallback\');">',
      "</div>",
      '<div class="product-main">',
      '<div class="product-topline">',
      '<span class="brand-chip">' + escapeHtml(product.brand || "Marca") + "</span>",
      '<span class="status-chip ' + compat.level + '">' + escapeHtml(statusText) + "</span>",
      "</div>",
      '<p class="product-name">' + escapeHtml(product.name) + "</p>",
      '<div class="product-meta">',
      '<span class="stock-chip">' + escapeHtml(String(product.stock)) + " disp.</span>",
      '<span class="product-code">Código ' + escapeHtml(product.code || "S/C") + "</span>",
      "</div>",
      '<div class="tag-list">' + tags + "</div>",
      '<div class="product-footer">',
      '<div class="price">' + currency.format(product.price) + "</div>",
      '<div class="product-buttons">',
      '<button class="detail-button" type="button" data-detail="' + escapeHtml(product.id) + '" title="Ver ficha" aria-label="Ver ficha">i</button>',
      '<button class="product-action" type="button" data-select="' + escapeHtml(product.id) + '">' + actionText + "</button>",
      "</div>",
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }

  function renderQuote() {
    var analysis = analyzeBuild();
    var totals = calculateTotals(0);
    var plans = calculatePricingPlans();
    dom.quoteId.textContent = state.quote.id;
    dom.healthPill.textContent = analysis.label;
    dom.healthPill.className = "health-pill" + (analysis.level === "ok" ? " ok" : analysis.level === "error" ? " bad" : "");
    dom.buildStatus.textContent = analysis.label;

    renderSelections();
    renderDiagnostics(analysis);
    dom.totalBox.innerHTML = [
      '<div class="pricing-summary">',
      totalRow("Precio lista", currency.format(totals.subtotal)),
      totalRow("Ensamble", "Gratis"),
      '<p class="pricing-note">Escenarios aplicables sobre Precio 1 del inventario.</p>',
      '<div class="discount-grid">',
      plans.map(function (plan) {
        return [
          '<div class="discount-card' + (plan.discountRate === 15 ? " featured" : "") + '">',
          '<span>' + (plan.discountRate ? plan.discountRate + "% descuento" : "Precio lista") + "</span>",
          '<strong>' + currency.format(plan.total) + "</strong>",
          '<small>' + (plan.discountRate ? "Ahorro " + currency.format(plan.discount) : "Sin descuento aplicado") + "</small>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</div>"
    ].join("");
  }

  function renderSelections() {
    var entries = getSelectedEntries();
    if (!entries.length) {
      dom.selectionList.innerHTML = '<div class="empty-state">Elige piezas del catálogo para armar la cotización.</div>';
      return;
    }

    dom.selectionList.innerHTML = entries.map(function (entry) {
      var category = categoryById(entry.product.category);
      var multiple = Boolean(category.multiple);
      return [
        '<div class="selection-item">',
        '<div class="selection-name">',
        '<strong>' + escapeHtml(entry.product.name) + "</strong>",
        '<span>' + escapeHtml(category.title) + " · Código " + escapeHtml(entry.product.code) + " · " + currency.format(entry.product.price) + "</span>",
        "</div>",
        '<div class="selection-controls">',
        multiple ? '<button class="qty-button" type="button" data-id="' + escapeHtml(entry.product.id) + '" data-qty="-1" aria-label="Restar">−</button>' : "",
        '<output>' + entry.qty + "</output>",
        multiple ? '<button class="qty-button" type="button" data-id="' + escapeHtml(entry.product.id) + '" data-qty="1" aria-label="Sumar">+</button>' : "",
        '<button class="qty-button" type="button" data-id="' + escapeHtml(entry.product.id) + '" data-qty="-999" aria-label="Quitar">×</button>',
        "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderDiagnostics(analysis) {
    if (!analysis.messages.length) {
      dom.diagnosticList.innerHTML = '<div class="diagnostic-item ok">Combo validado: no se detectan conflictos entre socket, DDR, gabinete, video y fuente.</div>';
      return;
    }

    dom.diagnosticList.innerHTML = analysis.messages.map(function (message) {
      return '<div class="diagnostic-item ' + message.severity + '">' + escapeHtml(message.text) + "</div>";
    }).join("");
  }

  function totalRow(label, value) {
    return '<div class="total-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + "</strong></div>";
  }

  function toggleProduct(productId) {
    var product = productById.get(productId);
    if (!product) {
      return;
    }

    var category = categoryById(product.category);
    if (!state.selections[product.category]) {
      state.selections[product.category] = {};
    }

    if (category.multiple) {
      state.selections[product.category][productId] = (state.selections[product.category][productId] || 0) + 1;
      if (state.selections[product.category][productId] > Number(product.stock || 1)) {
        state.selections[product.category][productId] = Number(product.stock || 1);
        toast("Cantidad limitada por existencia.");
      }
    } else {
      if (state.selections[product.category][productId]) {
        state.selections[product.category] = {};
      } else {
        state.selections[product.category] = {};
        state.selections[product.category][productId] = 1;
      }
    }

    saveState();
    render();
  }

  function changeQuantity(productId, delta) {
    var product = productById.get(productId);
    if (!product) {
      return;
    }
    var category = product.category;
    var current = Number((state.selections[category] || {})[productId] || 0);
    var next = delta === -999 ? 0 : current + delta;
    if (next <= 0) {
      delete state.selections[category][productId];
    } else {
      state.selections[category][productId] = Math.min(next, Number(product.stock || next));
    }
    saveState();
    render();
  }

  function applyPreset(name, options) {
    var preset = presets[name];
    if (!preset) {
      return;
    }

    state.selections = {};
    preset.forEach(function (entry) {
      var product = productByCode.get(String(entry.code));
      if (!product) {
        return;
      }
      var category = categoryById(product.category);
      if (!state.selections[product.category]) {
        state.selections[product.category] = {};
      }
      if (category.multiple) {
        state.selections[product.category][product.id] = Math.min(Number(entry.qty || 1), Number(product.stock || 1));
      } else {
        state.selections[product.category] = {};
        state.selections[product.category][product.id] = 1;
      }
    });
    state.activeCategory = "cpu";

    if (!options || !options.silent) {
      toast("Preset aplicado. Revisa la validación y ajusta accesorios.");
      saveState();
    }
    render();
  }

  function productCompatibility(product) {
    var messages = [];
    var level = "ok";
    var cpu = selectedOrOverride("cpu", product);
    var board = selectedOrOverride("motherboard", product);
    var selectedCase = selectedOrOverride("case", product);
    var psu = selectedOrOverride("psu", product);
    var power = calculatePower(product);

    function block(text) {
      level = "blocked";
      messages.push(text);
    }

    function warn(text) {
      if (level !== "blocked") {
        level = "warn";
      }
      messages.push(text);
    }

    function neutral(text) {
      if (level === "ok") {
        level = "neutral";
      }
      messages.push(text);
    }

    if (product.category === "cpu" && board && product.specs.socket !== board.specs.socket) {
      block("Socket " + product.specs.socket + " no coincide con la placa " + board.specs.socket + ".");
    }

    if (product.category === "motherboard") {
      if (cpu && product.specs.socket !== cpu.specs.socket) {
        block("La placa es " + product.specs.socket + " y el procesador elegido es " + cpu.specs.socket + ".");
      }
      getCategoryEntries("ram").forEach(function (entry) {
        if (entry.product.specs.memoryType && product.specs.memoryType !== entry.product.specs.memoryType) {
          block("La RAM seleccionada es " + entry.product.specs.memoryType + " y la placa usa " + product.specs.memoryType + ".");
        }
      });
      if (selectedCase && selectedCase.specs.supportedMotherboards.indexOf(product.specs.formFactor) < 0) {
        block("El gabinete elegido no soporta placa " + product.specs.formFactor + ".");
      }
    }

    if (product.category === "ram") {
      if (board && product.specs.memoryType !== board.specs.memoryType) {
        block("La placa seleccionada usa " + board.specs.memoryType + ".");
      } else if (!board) {
        neutral("El DDR se validará al elegir tarjeta madre.");
      }
    }

    if (product.category === "case") {
      if (board && product.specs.supportedMotherboards.indexOf(board.specs.formFactor) < 0) {
        block("No soporta placa " + board.specs.formFactor + ".");
      }
      if (psu && !caseSupportsPsu(product, psu)) {
        block("Este gabinete requiere fuente " + product.specs.psuSupport.join(" / ") + ".");
      }
    }

    if (product.category === "psu" && selectedCase && !caseSupportsPsu(selectedCase, product)) {
      block("El gabinete elegido requiere fuente " + selectedCase.specs.psuSupport.join(" / ") + ".");
    }

    if (product.category === "gpu" || product.category === "psu" || product.category === "case") {
      if (power.availableW && power.availableW < power.recommendedW) {
        warn("Fuente disponible " + power.availableW + "W; recomendado " + power.recommendedW + "W.");
      }
    }

    if (product.category === "cooling" && cpu && product.specs.sockets && product.specs.sockets.length) {
      if (product.specs.coolingType !== "Fan" && product.specs.sockets.indexOf(cpu.specs.socket) < 0) {
        block("No lista soporte para " + cpu.specs.socket + ".");
      }
    }

    if (product.category === "storage" && board && product.specs.interface === "NVMe") {
      var existingM2 = getCategoryEntries("storage").filter(function (entry) {
        return entry.product.specs.interface === "NVMe";
      }).reduce(function (sum, entry) { return sum + entry.qty; }, 0);
      var requested = isSelected(product.id) ? existingM2 : existingM2 + 1;
      if (requested > (board.specs.m2Slots || 1)) {
        warn("La placa tiene " + (board.specs.m2Slots || 1) + " ranura(s) M.2 estimadas.");
      }
    }

    if (!messages.length) {
      messages.push("Compatible con la selección actual.");
    }

    return {
      level: level,
      messages: messages,
      shortLabel: level === "blocked" ? "No compatible" : level === "warn" ? "Revisar" : level === "neutral" ? "Por validar" : "Compatible"
    };
  }

  function analyzeBuild() {
    var messages = [];
    var cpu = getFirst("cpu");
    var board = getFirst("motherboard");
    var selectedCase = getFirst("case");
    var gpu = getFirst("gpu");
    var psu = getFirst("psu");
    var ramEntries = getCategoryEntries("ram");
    var storageEntries = getCategoryEntries("storage");
    var coolingEntries = getCategoryEntries("cooling");
    var power = calculatePower();

    function add(severity, text) {
      messages.push({ severity: severity, text: text });
    }

    ["cpu", "motherboard", "ram", "storage", "case"].forEach(function (categoryId) {
      if (!getCategoryEntries(categoryId).length) {
        add("error", "Falta " + categoryById(categoryId).title + ".");
      }
    });

    if (!power.availableW) {
      add("error", "Falta fuente de poder o gabinete con fuente incluida.");
    }

    if (cpu && board && cpu.specs.socket !== board.specs.socket) {
      add("error", "Procesador " + cpu.specs.socket + " no coincide con tarjeta madre " + board.specs.socket + ".");
    }

    if (board && ramEntries.length) {
      ramEntries.forEach(function (entry) {
        if (entry.product.specs.memoryType !== board.specs.memoryType) {
          add("error", "RAM " + entry.product.specs.memoryType + " incompatible con placa " + board.specs.memoryType + ".");
        }
      });
    }

    if (board && selectedCase && selectedCase.specs.supportedMotherboards.indexOf(board.specs.formFactor) < 0) {
      add("error", "El gabinete no soporta tarjeta madre " + board.specs.formFactor + ".");
    }

    if (selectedCase && psu && !caseSupportsPsu(selectedCase, psu)) {
      add("error", "El gabinete seleccionado requiere fuente " + selectedCase.specs.psuSupport.join(" / ") + "; la fuente elegida es " + (psu.specs.psuFormFactor || "ATX") + ".");
    }

    if (cpu && !gpu && !cpu.specs.hasIntegratedGraphics) {
      add("error", "El procesador seleccionado no tiene video integrado; agrega una tarjeta de video.");
    }

    if (power.availableW && power.availableW < power.recommendedW) {
      add("error", "Fuente insuficiente: " + power.availableW + "W disponible contra " + power.recommendedW + "W recomendado.");
    }

    if (cpu && cpu.specs.tdp >= 105 && !coolingEntries.length) {
      add("warn", "CPU de alto consumo: agrega refrigeración dedicada antes de cerrar la cotización.");
    }

    if (gpu && cpu) {
      var diff = Number(gpu.specs.tier || 0) - Number(cpu.specs.tier || 0);
      if (diff >= 4) {
        add("warn", "GPU muy por encima del CPU; revisa balance para juegos competitivos.");
      }
      if (diff <= -5 && gpu.specs.tier <= 3) {
        add("warn", "CPU fuerte con GPU básica; puede ser mejor reasignar presupuesto.");
      }
    }

    if (board && storageEntries.length) {
      var m2Count = storageEntries.filter(function (entry) {
        return entry.product.specs.interface === "NVMe";
      }).reduce(function (sum, entry) { return sum + entry.qty; }, 0);
      if (m2Count > (board.specs.m2Slots || 1)) {
        add("warn", "Hay " + m2Count + " SSD NVMe y la placa tiene " + (board.specs.m2Slots || 1) + " ranura(s) M.2 estimadas.");
      }
    }

    if (!messages.some(function (message) { return message.severity === "error"; })) {
      if (getSelectedEntries().length) {
        add("ok", "Consumo estimado " + power.estimatedLoadW + "W; fuente recomendada " + power.recommendedW + "W.");
      }
      var ramTotal = ramEntries.reduce(function (sum, entry) {
        return sum + Number(entry.product.specs.capacityGB || 0) * entry.qty;
      }, 0);
      if (ramTotal) {
        add("ok", "Memoria total: " + ramTotal + "GB.");
      }
    }

    var hasError = messages.some(function (message) { return message.severity === "error"; });
    var hasWarn = messages.some(function (message) { return message.severity === "warn"; });
    var requiredMissing = ["cpu", "motherboard", "ram", "storage", "case"].some(function (categoryId) {
      return !getCategoryEntries(categoryId).length;
    });

    return {
      messages: messages,
      level: hasError || requiredMissing ? "error" : hasWarn ? "warn" : "ok",
      label: hasError || requiredMissing ? "Revisar" : hasWarn ? "Casi listo" : "Listo"
    };
  }

  function calculatePower(overrideProduct) {
    var cpu = selectedOrOverride("cpu", overrideProduct);
    var gpu = selectedOrOverride("gpu", overrideProduct);
    var psu = selectedOrOverride("psu", overrideProduct);
    var selectedCase = selectedOrOverride("case", overrideProduct);
    var ramQty = getCategoryEntries("ram").reduce(function (sum, entry) {
      return sum + entry.qty;
    }, 0);
    var storageQty = getCategoryEntries("storage").reduce(function (sum, entry) {
      return sum + entry.qty;
    }, 0);
    var coolingQty = getCategoryEntries("cooling").reduce(function (sum, entry) {
      return sum + entry.qty;
    }, 0);

    if (overrideProduct && overrideProduct.category === "ram" && !isSelected(overrideProduct.id)) {
      ramQty += 1;
    }
    if (overrideProduct && overrideProduct.category === "storage" && !isSelected(overrideProduct.id)) {
      storageQty += 1;
    }
    if (overrideProduct && overrideProduct.category === "cooling" && !isSelected(overrideProduct.id)) {
      coolingQty += 1;
    }

    var cpuW = cpu ? Number(cpu.specs.tdp || 65) : 0;
    var gpuW = gpu ? Number(gpu.specs.wattage || 0) : 0;
    var base = getSelectedEntries().length ? 70 : 0;
    var estimatedLoadW = Math.ceil(base + cpuW + gpuW + ramQty * 5 + storageQty * 8 + coolingQty * 6);
    var recommendedW = estimatedLoadW ? Math.max(450, Math.ceil((estimatedLoadW * 1.35) / 50) * 50) : 0;
    var availableW = psu ? Number(psu.specs.wattage || 0) : selectedCase ? Number(selectedCase.specs.includedPsuW || 0) : 0;

    return {
      estimatedLoadW: estimatedLoadW,
      recommendedW: recommendedW,
      availableW: availableW,
      source: psu ? "Fuente seleccionada" : selectedCase && selectedCase.specs.includedPsuW ? "Fuente incluida en gabinete" : ""
    };
  }

  function selectedOrOverride(categoryId, overrideProduct) {
    if (overrideProduct && overrideProduct.category === categoryId && !categoryById(categoryId).multiple) {
      return overrideProduct;
    }
    return getFirst(categoryId);
  }

  function caseSupportsPsu(caseProduct, psuProduct) {
    if (!caseProduct || !psuProduct) {
      return true;
    }
    var support = caseProduct.specs.psuSupport || ["ATX"];
    var form = psuProduct.specs.psuFormFactor || "ATX";
    return support.indexOf(form) >= 0;
  }

  function calculateTotals(discountRate) {
    var subtotal = getSelectedEntries().reduce(function (sum, entry) {
      return sum + Number(entry.product.price || 0) * entry.qty;
    }, 0);
    var rate = Math.max(0, Number(discountRate || 0));
    var discount = subtotal * (rate / 100);
    return {
      subtotal: roundMoney(subtotal),
      assembly: 0,
      discountRate: rate,
      discount: roundMoney(discount),
      total: roundMoney(subtotal - discount)
    };
  }

  function calculatePricingPlans() {
    return discountRates.map(function (rate) {
      return calculateTotals(rate);
    });
  }

  function getSelectedEntries() {
    return Object.keys(state.selections).flatMap(function (categoryId) {
      return getCategoryEntries(categoryId);
    }).sort(function (a, b) {
      return categoryOrder(a.product.category) - categoryOrder(b.product.category);
    });
  }

  function getCategoryEntries(categoryId) {
    var map = state.selections[categoryId] || {};
    return Object.keys(map).map(function (id) {
      return { product: productById.get(id), qty: Number(map[id] || 1) };
    }).filter(function (entry) {
      return entry.product;
    });
  }

  function getFirst(categoryId) {
    var entry = getCategoryEntries(categoryId)[0];
    return entry ? entry.product : null;
  }

  function isSelected(productId) {
    var product = productById.get(productId);
    return Boolean(product && state.selections[product.category] && state.selections[product.category][productId]);
  }

  function getActiveCategory() {
    return categoryById(state.activeCategory) || categories[0];
  }

  function categoryById(id) {
    return categories.find(function (category) {
      return category.id === id;
    }) || { id: id, title: id, short: id, multiple: false };
  }

  function categoryOrder(categoryId) {
    return categories.findIndex(function (category) {
      return category.id === categoryId;
    });
  }

  function productSorter(sort) {
    return function (a, b) {
      if (sort === "priceAsc") {
        return a.price - b.price;
      }
      if (sort === "priceDesc") {
        return b.price - a.price;
      }
      if (sort === "stockDesc") {
        return Number(b.stock || 0) - Number(a.stock || 0);
      }
      if (sort === "nameAsc") {
        return a.name.localeCompare(b.name, "es");
      }
      return Number(b.score || 0) - Number(a.score || 0);
    };
  }

  function productSearchText(product) {
    return normalizeSearch([
      product.name,
      product.code,
      product.barcode,
      product.brand,
      (product.tags || []).join(" "),
      JSON.stringify(product.specs || {})
    ].join(" "));
  }

  function shortProductName(product) {
    var name = String(product.name || "");
    return name
      .replace(/^PROCESADOR\s+/i, "")
      .replace(/^TARJETA DE VIDEO\s+(PCI-E\s+)?/i, "")
      .replace(/^MEM RAM DT\s+/i, "")
      .replace(/^FUENTE DE PODER\s+/i, "")
      .replace(/^MTB\s+/i, "")
      .replace(/^CASE\s+/i, "")
      .trim();
  }

  function normalizeSearch(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function createQuoteId() {
    var date = new Date();
    var stamp = [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("");
    return "PC-" + stamp + "-" + String(date.getTime()).slice(-4);
  }

  function formatCatalogDate(value) {
    if (!value) {
      return "fecha no indicada";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("es-SV", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function numberInput(value) {
    return String(Number(value || 0));
  }

  function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function openProductDialog(productId) {
    var product = productById.get(productId);
    if (!product) {
      return;
    }
    var category = categoryById(product.category);
    var compat = productCompatibility(product);
    var specs = Object.keys(product.specs || {}).map(function (key) {
      var value = product.specs[key];
      if (Array.isArray(value)) {
        value = value.join(", ");
      }
      if (value === true) {
        value = "Sí";
      }
      if (value === false) {
        value = "No";
      }
      if (value == null || value === "") {
        value = "N/D";
      }
      return '<div class="spec-cell"><span>' + escapeHtml(labelize(key)) + '</span><strong>' + escapeHtml(value) + "</strong></div>";
    }).join("");
    var locations = Object.keys(product.locations || {}).map(function (name) {
      return '<span class="tag">' + escapeHtml(name) + ": " + escapeHtml(product.locations[name]) + "</span>";
    }).join("");

    dom.dialogBody.innerHTML = [
      '<div class="dialog-layout">',
      '<div class="dialog-image"><img src="' + escapeAttribute(product.image) + '" alt="' + escapeAttribute(product.name) + '" onerror="this.remove(); this.parentElement.classList.add(\'image-fallback\');"></div>',
      '<div class="dialog-copy">',
      '<div><p class="eyebrow">' + escapeHtml(category.title) + " · Código " + escapeHtml(product.code) + '</p><h2>' + escapeHtml(product.name) + "</h2></div>",
      '<div class="product-meta"><span class="brand-chip">' + escapeHtml(product.brand) + '</span><span class="stock-chip">' + escapeHtml(product.stock) + ' disp.</span><span class="status-chip ' + compat.level + '">' + escapeHtml(compat.shortLabel) + "</span></div>",
      '<div class="tag-list">' + (product.tags || []).map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + "</span>"; }).join("") + "</div>",
      '<div class="spec-grid">' + specs + "</div>",
      '<div class="tag-list">' + locations + "</div>",
      '<p class="eyebrow">Imagen web: ' + escapeHtml(product.imageQuery) + "</p>",
      '<div class="product-footer"><div class="price">' + currency.format(product.price) + '</div><button class="product-action" type="button" data-dialog-select="' + escapeHtml(product.id) + '">' + (isSelected(product.id) ? "Quitar" : "Agregar") + "</button></div>",
      "</div>",
      "</div>"
    ].join("");

    if (typeof dom.productDialog.showModal === "function") {
      dom.productDialog.showModal();
    } else {
      dom.productDialog.setAttribute("open", "open");
    }
  }

  function closeProductDialog() {
    if (typeof dom.productDialog.close === "function") {
      dom.productDialog.close();
    } else {
      dom.productDialog.removeAttribute("open");
    }
  }

  function labelize(value) {
    return String(value)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, function (char) { return char.toUpperCase(); });
  }

  function quoteContext() {
    var totals = calculateTotals(0);
    var analysis = analyzeBuild();
    var today = new Date();
    var valid = new Date(today.getTime());
    valid.setDate(valid.getDate() + Number(state.quote.validDays || 7));
    return {
      entries: getSelectedEntries(),
      totals: totals,
      plans: calculatePricingPlans(),
      analysis: analysis,
      created: today,
      validUntil: valid
    };
  }

  function generateQuoteHtml() {
    var ctx = quoteContext();
    var rows = ctx.entries.map(function (entry) {
      return [
        "<tr>",
        "<td>" + escapeHtml(entry.product.code) + "</td>",
        "<td>" + escapeHtml(categoryById(entry.product.category).title) + "</td>",
        "<td>" + escapeHtml(entry.product.name) + "</td>",
        '<td class="right">' + entry.qty + "</td>",
        '<td class="right">' + currency.format(entry.product.price) + "</td>",
        '<td class="right">' + currency.format(entry.product.price * entry.qty) + "</td>",
        "</tr>"
      ].join("");
    }).join("");
    var diagnostics = ctx.analysis.messages.map(function (message) {
      return "<li><strong>" + escapeHtml(message.severity.toUpperCase()) + ":</strong> " + escapeHtml(message.text) + "</li>";
    }).join("");
    var planRows = ctx.plans.map(function (plan) {
      return [
        "<tr>",
        "<td>" + (plan.discountRate ? plan.discountRate + "% descuento" : "Precio lista") + "</td>",
        '<td class="right">' + (plan.discountRate ? currency.format(plan.discount) : "-") + "</td>",
        '<td class="right"><strong>' + currency.format(plan.total) + "</strong></td>",
        "</tr>"
      ].join("");
    }).join("");
    var customer = [
      state.quote.clientName || "Cliente sin nombre",
      state.quote.clientContact,
      state.quote.clientEmail
    ].filter(Boolean).map(escapeHtml).join("<br>");

    return [
      "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>" + escapeHtml(state.quote.id) + "</title>",
      "<style>",
      "body{font-family:Arial,sans-serif;color:#172026;margin:28px;line-height:1.4}h1,h2{margin:0}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #172026;padding-bottom:16px}.muted{color:#68737d}.box{border:1px solid #d7dde2;padding:12px;margin-top:14px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border-bottom:1px solid #d7dde2;padding:8px;text-align:left;font-size:12px}th{background:#eef3f5}.right{text-align:right}.total{font-size:20px;font-weight:800}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.notes{white-space:pre-wrap}.free{color:#177245;font-weight:800}",
      "</style></head><body>",
      '<div class="head"><div><p class="muted">Cotización de combo PC</p><h1>' + escapeHtml(state.quote.id) + "</h1><p>Inventario: " + escapeHtml(catalog.sourceFile) + "</p></div>",
      "<div><strong>Fecha:</strong> " + escapeHtml(formatDate(ctx.created)) + "<br><strong>Válida hasta:</strong> " + escapeHtml(formatDate(ctx.validUntil)) + "<br><strong>Estado:</strong> " + escapeHtml(ctx.analysis.label) + "</div></div>",
      '<div class="grid"><div class="box"><h2>Cliente</h2><p>' + (customer || "N/D") + '</p></div><div class="box"><h2>Condiciones</h2><p>Precios sujetos a disponibilidad y confirmación final de ventas.</p></div></div>',
      "<table><thead><tr><th>Código</th><th>Categoría</th><th>Producto</th><th class=\"right\">Cant.</th><th class=\"right\">Precio</th><th class=\"right\">Total</th></tr></thead><tbody>",
      rows || '<tr><td colspan="6">Sin productos seleccionados.</td></tr>',
      "</tbody></table>",
      '<div class="box"><h2>Escenarios de precio</h2>',
      '<p>Subtotal Precio 1: <strong>' + currency.format(ctx.totals.subtotal) + '</strong><br>Ensamble: <span class="free">Gratis</span></p>',
      '<table><thead><tr><th>Escenario</th><th class="right">Ahorro</th><th class="right">Total</th></tr></thead><tbody>' + planRows + "</tbody></table></div>",
      '<div class="box"><h2>Validación técnica</h2><ul>' + (diagnostics || "<li>Sin observaciones.</li>") + "</ul></div>",
      state.quote.notes ? '<div class="box"><h2>Notas</h2><p class="notes">' + escapeHtml(state.quote.notes) + "</p></div>" : "",
      "</body></html>"
    ].join("");
  }

  function generateCsv() {
    var header = ["Código", "Categoría", "Producto", "Marca", "Cantidad", "Precio", "Total", "Stock"];
    var rows = getSelectedEntries().map(function (entry) {
      return [
        entry.product.code,
        categoryById(entry.product.category).title,
        entry.product.name,
        entry.product.brand,
        entry.qty,
        entry.product.price,
        roundMoney(entry.product.price * entry.qty),
        entry.product.stock
      ];
    });
    return [header].concat(rows).map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\n");
  }

  function csvCell(value) {
    return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  }

  function downloadQuoteHtml() {
    downloadBlob(generateQuoteHtml(), filename("html"), "text/html;charset=utf-8");
    toast("Cotización HTML descargada.");
  }

  function downloadCsv() {
    downloadBlob(generateCsv(), filename("csv"), "text/csv;charset=utf-8");
    toast("CSV descargado.");
  }

  function printQuote() {
    var win = window.open("", "_blank");
    if (!win) {
      toast("El navegador bloqueó la ventana de impresión.");
      return;
    }
    win.document.open();
    win.document.write(generateQuoteHtml());
    win.document.close();
    win.focus();
    setTimeout(function () {
      win.print();
    }, 300);
  }

  function filename(extension) {
    return state.quote.id.toLowerCase() + "-cotizacion." + extension;
  }

  function downloadBlob(content, name, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function copySummary() {
    var text = generateWhatsappText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Resumen copiado.");
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function sendWhatsappQuote() {
    var url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(generateWhatsappText());
    window.open(url, "_blank");
  }

  function generateWhatsappText() {
    var ctx = quoteContext();
    var customer = state.quote.clientName ? "Cliente: " + state.quote.clientName : "Cliente: por confirmar";
    var contact = state.quote.clientContact ? "Contacto: " + state.quote.clientContact : "";
    var email = state.quote.clientEmail ? "Correo: " + state.quote.clientEmail : "";
    var lines = [
      "*Cotización " + state.quote.id + "*",
      customer,
      contact,
      email,
      "Estado técnico: " + ctx.analysis.label,
      "Válida hasta: " + formatDate(ctx.validUntil),
      "",
      "*Componentes solicitados:*"
    ].filter(Boolean);

    if (!ctx.entries.length) {
      lines.push("Sin productos seleccionados.");
    } else {
      ctx.entries.forEach(function (entry) {
        lines.push("- " + entry.qty + " x [" + entry.product.code + "] " + entry.product.name + " · " + currency.format(entry.product.price));
      });
    }

    lines.push("");
    lines.push("*Escenarios de precio sobre Precio 1:*");
    lines.push("Ensamble: Gratis");
    ctx.plans.forEach(function (plan) {
      lines.push("- " + (plan.discountRate ? plan.discountRate + "% descuento" : "Precio lista") + ": " + currency.format(plan.total) + (plan.discountRate ? " (ahorro " + currency.format(plan.discount) + ")" : ""));
    });

    if (ctx.analysis.messages.length) {
      lines.push("");
      lines.push("*Validación técnica:*");
      ctx.analysis.messages.forEach(function (message) {
        lines.push("- " + message.text);
      });
    }

    if (state.quote.notes) {
      lines.push("");
      lines.push("*Notas:* " + state.quote.notes);
    }

    return lines.join("\n");
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    toast("Resumen copiado.");
  }

  function toast(message) {
    var node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () {
      node.remove();
    }, 2400);
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("es-SV", { dateStyle: "medium" }).format(date);
  }

  function runSmokeTests() {
    var results = [];
    var failures = 0;

    function assert(condition, message) {
      if (condition) {
        results.push("PASS " + message);
      } else {
        failures += 1;
        results.push("FAIL " + message);
      }
    }

    state = freshState();
    assert(products.length === Number(catalog.audit.filteredProducts || products.length), "conteo de productos coincide con auditoría");
    assert(products.every(function (product) { return product.code && product.price > 0 && product.stock > 0; }), "todos los productos tienen código, precio y stock");
    applyPreset("gaming", { silent: true });
    var analysis = analyzeBuild();
    assert(getSelectedEntries().length >= 8, "preset gaming selecciona torre y setup");
    assert(!analysis.messages.some(function (message) { return message.severity === "error"; }), "preset gaming no tiene errores críticos");
    assert(generateQuoteHtml().indexOf("Cotización de combo PC") >= 0, "cotización HTML se genera");
    assert(generateCsv().indexOf("\"Código\"") === 0, "CSV se genera con encabezado");
    assert(generateWhatsappText().indexOf("Escenarios de precio") >= 0, "mensaje de WhatsApp se genera con descuentos");
    assert(calculateTotals(25).total < calculateTotals(0).total, "escenario de 25% reduce el total");
    assert(productCompatibility(productByCode.get("3766")).level !== "blocked", "RTX 5060 del preset es compatible");

    document.body.dataset.smokeStatus = failures ? "fail" : "pass";
    var pre = document.createElement("pre");
    pre.id = "smokeResults";
    pre.textContent = results.join("\n");
    document.body.appendChild(pre);
  }

  window.PCBuilderApp = {
    state: state,
    products: products,
    analyzeBuild: analyzeBuild,
    calculatePower: calculatePower,
    calculateTotals: calculateTotals,
    applyPreset: applyPreset,
    generateQuoteHtml: generateQuoteHtml,
    generateWhatsappText: generateWhatsappText,
    generateCsv: generateCsv
  };
})();
