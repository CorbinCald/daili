// The currency change dialog: pick a currency, then keep or convert every
// saved value (components/daili/settings/CurrencySettingsRow.tsx,
// CurrencyPicker.tsx and CurrencyConversionForm.tsx).

import { createCurrencyProfile, formatCurrency } from "../format.mjs";
import {
  button,
  h,
  inlineActionButton,
  primaryButton,
  textInput,
} from "../ui.mjs";
import { currencyOptions } from "../currencies.mjs";

function isExchangeRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getLastExchangeRate(from, to, saved) {
  const direct = saved[`${from}/${to}`];
  const inverse = saved[`${to}/${from}`];
  const previous =
    direct && (!inverse || direct.date >= inverse.date)
      ? direct
      : inverse
        ? { date: inverse.date, rate: 1 / inverse.rate }
        : null;
  if (previous && isExchangeRate(previous.rate))
    return { ...previous, source: "saved" };
  const base = currencyOptions.find((currency) => currency.code === from);
  const quote = currencyOptions.find((currency) => currency.code === to);
  if (!base?.rate || !quote?.rate || !base.date || !quote.date) return null;
  return {
    date: base.date < quote.date ? base.date : quote.date,
    rate: quote.rate / base.rate,
    source: "reference",
  };
}

export function parseExchangeRate(text) {
  const value = text.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value)) return Number.NaN;
  const rate = Number(value.replace(",", "."));
  return isExchangeRate(rate) ? rate : Number.NaN;
}

export function formatExchangeRate(rate) {
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 17,
    useGrouping: false,
  }).format(rate);
}

function currencyPicker({ currentCode, onSelect }) {
  const list = h("div", { class: "s-currency-list" });
  let names = null;
  try {
    names = new Intl.DisplayNames(["en-US"], { type: "currency" });
  } catch {
    // The ISO name from the catalogue is enough.
  }
  const options = currencyOptions.map((option) => ({
    ...option,
    name: names?.of(option.code) ?? option.name,
  }));
  const render = (query) => {
    const filtered = options.filter(({ code, name }) =>
      `${code} ${name}`.toLowerCase().includes(query),
    );
    list.replaceChildren(
      ...(filtered.length === 0
        ? [h("p", { class: "s-currency-name" }, "No currencies found.")]
        : []),
      ...filtered.map((item) =>
        button(
          {
            "aria-label": `${item.code} · ${item.name}`,
            class: "s-currency-option",
            disabled: item.code === currentCode || undefined,
            onClick: () => onSelect(item.code),
          },
          h("span", { class: "s-currency-code" }, item.code),
          h("span", { class: "s-currency-name" }, item.name),
          item.code === currentCode
            ? h("span", { class: "s-currency-code" }, "✓")
            : null,
        ),
      ),
    );
  };
  const search = textInput({
    ariaLabel: "Search currencies",
    className: "s-currency-search",
    onChange: (value) => render(value.trim().toLowerCase()),
    placeholder: "Search currencies",
  });
  render("");
  return h("div", { class: "s-currency-picker" }, search, list);
}

function conversionForm({ ctx, from, onSaved, to }) {
  const profile = ctx.profile;
  const targetProfile = createCurrencyProfile(to);
  const state = ctx.state;
  const known = getLastExchangeRate(from, to, state.exchangeRates);
  let rateText = known ? formatExchangeRate(known.rate) : "";
  let mode = "keep";
  const error = h("p", { class: "s-field-error", hidden: true });
  const preview = h("p", { class: "s-hint" });
  const rateInvalid = h(
    "p",
    { class: "s-field-error", hidden: true },
    "Enter a rate greater than zero.",
  );
  const rateInput = textInput({
    ariaLabel: "Exchange rate",
    className: "s-rate-input",
    onChange: (value) => {
      rateText = value;
      refresh();
    },
    placeholder: "0",
    value: rateText,
  });
  const rateSection = h(
    "div",
    { class: "s-rate-section", hidden: true },
    h("p", { class: "s-choice-title" }, "Exchange rate"),
    h(
      "div",
      { class: "s-rate-row" },
      h("span", { class: "s-rate-currency" }, `1 ${from} =`),
      rateInput,
      h("span", { class: "s-rate-currency" }, to),
    ),
    h(
      "p",
      { class: "s-hint" },
      known
        ? known.source === "saved"
          ? `Last used · ${known.date}`
          : `Reference rate · ${known.date}. Check before converting.`
        : "Enter a rate to convert.",
    ),
    h(
      "a",
      {
        class: "s-link-text",
        href: `https://www.google.com/search?q=${encodeURIComponent(`1 ${from} to ${to} exchange rate`)}`,
        rel: "noopener",
        target: "_blank",
      },
      "Search in Browser ↗",
    ),
    rateInvalid,
    h(
      "p",
      { class: "s-hint" },
      `Converted amounts are rounded to ${targetProfile.fractionDigits} decimal places.`,
    ),
  );
  const choices = ["keep", "convert"].map((choice) =>
    button(
      {
        "aria-checked": String(mode === choice),
        class: "s-choice",
        role: "radio",
        onClick: () => {
          mode = choice;
          error.hidden = true;
          refresh();
        },
      },
      h(
        "span",
        { class: "s-choice-title" },
        `${mode === choice ? "◉" : "○"} ${choice === "keep" ? "Keep current values" : "Convert current values"}`,
      ),
      h(
        "span",
        { class: "s-hint" },
        choice === "keep"
          ? "Change the currency without changing any saved numbers."
          : "Convert all expenses, recurring costs, budgets, income and savings, including history.",
      ),
    ),
  );
  const apply = primaryButton({
    label: "Keep values & change currency",
    onClick: () => save(),
  });
  const save = () => {
    const rate = parseExchangeRate(rateText);
    if (mode === "convert" && !Number.isFinite(rate)) return;
    const result = ctx.store.actions.changeCurrency(
      mode === "keep" ? { from, mode, to } : { from, mode, rate, to },
    );
    if (result === "saved") {
      onSaved();
      return;
    }
    error.textContent =
      result === "out-of-range"
        ? "This rate makes a saved amount too large. Check the rate."
        : result === "invalid"
          ? "Enter a rate greater than zero."
          : "Could not save. Please try again.";
    error.hidden = false;
  };
  const refresh = () => {
    const rate = parseExchangeRate(rateText);
    choices.forEach((choice, index) => {
      const value = index === 0 ? "keep" : "convert";
      choice.classList.toggle("is-selected", mode === value);
      choice.setAttribute("aria-checked", String(mode === value));
      choice.firstChild.textContent = `${mode === value ? "◉" : "○"} ${value === "keep" ? "Keep current values" : "Convert current values"}`;
    });
    rateSection.hidden = mode !== "convert";
    rateInvalid.hidden = mode !== "convert" || Number.isFinite(rate);
    const budget = state.monthlyBudget;
    if (budget === null) preview.hidden = true;
    else {
      const after = budget * (mode === "convert" ? rate : 1);
      preview.hidden = !Number.isFinite(after);
      preview.textContent = `Monthly cap: ${formatCurrency(budget, profile)} → ${formatCurrency(after, targetProfile)}`;
    }
    apply.setLabel(
      mode === "keep"
        ? "Keep values & change currency"
        : "Convert & change currency",
    );
    apply.setDisabled(mode === "convert" && !Number.isFinite(rate));
  };
  refresh();
  return h(
    "div",
    { class: "s-conversion" },
    h("p", { class: "s-currency-pair" }, `${from} → ${to}`),
    ...choices,
    rateSection,
    preview,
    error,
    apply.el,
  );
}

export function openCurrencyDialog(ctx) {
  const from = ctx.state.currencyCode;
  ctx.host.modal({
    className: "s-currency-modal",
    render(close) {
      const body = h("div", { class: "s-currency-body" });
      const card = h(
        "div",
        { class: "s-modal-card s-currency-card" },
        h("h2", { class: "s-modal-title" }, "Change currency"),
        body,
      );
      const showPicker = () =>
        body.replaceChildren(
          currencyPicker({ currentCode: from, onSelect: showConversion }),
          inlineActionButton({ label: "Cancel", onClick: () => close() }).el,
        );
      const showConversion = (to) =>
        body.replaceChildren(
          inlineActionButton({
            label: "Choose another currency",
            onClick: showPicker,
          }).el,
          conversionForm({ ctx, from, onSaved: () => close(), to }),
          inlineActionButton({ label: "Cancel", onClick: () => close() }).el,
        );
      showPicker();
      return card;
    },
  });
}
