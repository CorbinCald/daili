// Localization for the simulated phone: an English, en-US formatting locale
// with the app's currency-profile rules (utils/i18n/currencyProfile.ts,
// utils/currency.ts, utils/i18n/formatters.ts, utils/currencyDisplay.ts).

export const FORMATTING_LOCALE = "en-US";

const STANDARD_MAX_INTEGER_DIGITS = 6;
const WHOLE_UNIT_MAX_INTEGER_DIGITS = 8;

const numberFormatters = new Map();

function numberFormatter(options) {
  const key = options ? JSON.stringify(options) : "";
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(FORMATTING_LOCALE, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

/** Everything amount rendering and entry need to know about one currency. */
export function createCurrencyProfile(code = "USD") {
  let fractionDigits = 2;
  let symbol = code;
  let symbolPosition = "prefix";
  try {
    const formatter = new Intl.NumberFormat(FORMATTING_LOCALE, {
      currency: code,
      style: "currency",
    });
    fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    const parts = formatter.formatToParts(1);
    const currencyIndex = parts.findIndex((part) => part.type === "currency");
    const integerIndex = parts.findIndex((part) => part.type === "integer");
    symbol = currencyIndex === -1 ? code : parts[currencyIndex].value;
    symbolPosition =
      currencyIndex !== -1 &&
      integerIndex !== -1 &&
      currencyIndex > integerIndex
        ? "suffix"
        : "prefix";
  } catch {
    // Unknown codes keep the ISO code as their symbol.
  }
  const maxIntegerDigits =
    fractionDigits === 0
      ? WHOLE_UNIT_MAX_INTEGER_DIGITS
      : STANDARD_MAX_INTEGER_DIGITS;
  const maxAmount = Number(
    `${"9".repeat(maxIntegerDigits)}${fractionDigits > 0 ? `.${"9".repeat(fractionDigits)}` : ""}`,
  );
  return {
    code,
    decimalSeparator: ".",
    fractionDigits,
    groupingSeparator: ",",
    maxAmount,
    maxIntegerDigits,
    symbol,
    symbolPosition,
  };
}

export function formatNumber(value, options) {
  return numberFormatter(options).format(value);
}

export function formatCurrency(value, profile) {
  return numberFormatter({ currency: profile.code, style: "currency" }).format(
    value,
  );
}

/** Rounds symmetrically around zero so gains and losses of equal size match. */
export function roundWholeAmount(value) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function formatWholeCurrency(value, profile) {
  const rounded = roundWholeAmount(value);
  const whole = formatNumber(Math.abs(rounded));
  const unsigned =
    profile.symbolPosition === "suffix"
      ? `${whole} ${profile.symbol}`
      : `${profile.symbol}${whole}`;
  return rounded < 0 ? `-${unsigned}` : unsigned;
}

export function formatCompactCurrency(value, profile) {
  const rounded = roundWholeAmount(value);
  if (value !== 0 && rounded === 0) {
    const minimum = 10 ** -profile.fractionDigits;
    return formatCurrency(
      Math.sign(value) * Math.max(Math.abs(value), minimum),
      profile,
    );
  }
  return formatWholeCurrency(value, profile);
}

export function formatSignedWholeCurrency(value, profile) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatWholeCurrency(Math.abs(value), profile)}`;
}

/** Short currency rendering for chart axes: "$5K" beneath "$15K", never mixed. */
export function formatCurrencyAxisValue(value, profile, referenceValue) {
  const magnitude = Math.abs(value);
  const unitBasis = Math.max(magnitude, Math.abs(referenceValue ?? value));
  const compactUnit =
    magnitude === 0
      ? null
      : unitBasis >= 1_000_000_000
        ? { divisor: 1_000_000_000, suffix: "B" }
        : unitBasis >= 1_000_000
          ? { divisor: 1_000_000, suffix: "M" }
          : unitBasis >= 10_000
            ? { divisor: 1_000, suffix: "K" }
            : null;
  const displayValue = compactUnit ? value / compactUnit.divisor : value;
  const displayMagnitude = Math.abs(displayValue);
  const formatter = numberFormatter({
    currency: profile.code,
    maximumFractionDigits: compactUnit
      ? 1
      : displayMagnitude > 0 && displayMagnitude < 10
        ? Math.min(profile.fractionDigits, 2)
        : 0,
    minimumFractionDigits: 0,
    style: "currency",
  });
  if (!compactUnit) return formatter.format(displayValue);
  const parts = formatter.formatToParts(displayValue);
  const numericTypes = ["decimal", "fraction", "group", "integer"];
  let lastNumeric = -1;
  parts.forEach((part, index) => {
    if (numericTypes.includes(part.type)) lastNumeric = index;
  });
  return parts
    .map(
      (part, index) =>
        `${part.value}${index === lastNumeric ? compactUnit.suffix : ""}`,
    )
    .join("");
}

// ---- amount entry -------------------------------------------------------

export function sanitizeCurrencyInput(value, profile) {
  const allowed = value.replace(/[^\d.,]/g, "");
  if (profile.fractionDigits === 0) {
    return allowed.replace(/[.,]/g, "").slice(0, profile.maxIntegerDigits);
  }
  const buildDecimal = (separatorIndex) => {
    const integerPart = allowed
      .slice(0, separatorIndex)
      .replace(/[.,]/g, "")
      .slice(0, profile.maxIntegerDigits);
    const fractionPart = allowed
      .slice(separatorIndex + 1)
      .replace(/[.,]/g, "")
      .slice(0, profile.fractionDigits);
    return `${integerPart}.${fractionPart}`;
  };
  const decimalIndex = allowed.indexOf(".");
  if (decimalIndex !== -1) return buildDecimal(decimalIndex);
  const commaIndex = allowed.indexOf(",");
  const commaIsUnique =
    commaIndex !== -1 && commaIndex === allowed.lastIndexOf(",");
  const looksLikeGrouping =
    commaIsUnique && /^\d{3}$/.test(allowed.slice(commaIndex + 1));
  if (commaIsUnique && !looksLikeGrouping) return buildDecimal(commaIndex);
  return allowed.replace(/[.,]/g, "").slice(0, profile.maxIntegerDigits);
}

export function parseCurrencyInput(value, profile) {
  const stripped = (
    profile.symbol ? value.split(profile.symbol).join("") : value
  ).replace(/[$\s]/g, "");
  if (!stripped || stripped === "." || stripped === "-" || stripped === "-.")
    return Number.NaN;
  const hasDot = stripped.includes(".");
  const hasComma = stripped.includes(",");
  let normalized = stripped;
  if (hasDot && hasComma) {
    const decimal =
      stripped.lastIndexOf(".") > stripped.lastIndexOf(",") ? "." : ",";
    const grouping = decimal === "." ? "," : ".";
    normalized = stripped.split(grouping).join("").replace(decimal, ".");
  } else if (hasComma) {
    normalized = stripped.split(",").join("");
  }
  if (!/^-?\d*\.?\d*$/.test(normalized)) return Number.NaN;
  return Number.parseFloat(normalized);
}

export function formatCurrencyInput(value, profile) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toFixed(profile.fractionDigits);
}

export function parseCurrencyEditInput(value, originalAmount, profile) {
  return typeof originalAmount === "number" &&
    value === formatCurrencyInput(originalAmount, profile)
    ? originalAmount
    : parseCurrencyInput(value, profile);
}

export function isUnchangedCurrencyAmount(value, originalAmount) {
  return Number.isFinite(value) && value >= 0 && value === originalAmount;
}

export function isBudgetAmount(value, profile) {
  return (
    Number.isFinite(value) &&
    value >= -profile.maxAmount &&
    value <= profile.maxAmount
  );
}

export function isPositiveAmount(value, profile) {
  return Number.isFinite(value) && value > 0 && value <= profile.maxAmount;
}

/**
 * Rounds a converted amount to the target currency's minor unit the way the
 * app does: a tolerance absorbs binary ties such as 1.005, and negative caps
 * round symmetrically, so saved amounts match the formatted preview.
 */
export function roundToProfile(value, profile) {
  const scale = 10 ** profile.fractionDigits;
  const scaled = Math.abs(value) * scale;
  return (
    (Math.sign(value) * Math.round(scaled + Number.EPSILON * scaled)) / scale
  );
}

// ---- dates and times ----------------------------------------------------

const dateFormatters = new Map();

function dateFormatter(options) {
  const key = JSON.stringify(options);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(FORMATTING_LOCALE, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatClockTime(date) {
  return dateFormatter({ hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(/[  ]/g, " ");
}

export function formatMonthName(monthIndex, form = "long") {
  return dateFormatter({ month: form }).format(new Date(2024, monthIndex, 15));
}

export function formatMonthYear(year, monthIndex) {
  return dateFormatter({ month: "long", year: "numeric" }).format(
    new Date(year, monthIndex, 15),
  );
}

export function formatShortMonthDay(date) {
  return dateFormatter({ day: "numeric", month: "short" }).format(date);
}

export function formatWeekdayShortMonthDay(date) {
  return dateFormatter({
    day: "numeric",
    month: "short",
    weekday: "long",
  }).format(date);
}

export function formatLongDate(date) {
  return dateFormatter({
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatFullDate(date) {
  return dateFormatter({
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(date);
}

export function formatBytes(bytes) {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe >= 1024 * 1024)
    return `${formatNumber(safe / (1024 * 1024), { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
  if (safe >= 1024) return `${Math.round(safe / 1024)} KB`;
  return `${safe} B`;
}

export function formatMebibytes(bytes) {
  return `${formatNumber(bytes / (1024 * 1024), { maximumFractionDigits: 2, minimumFractionDigits: 2 })} MiB`;
}

export function pluralItems(count) {
  return count === 1 ? "1 item" : `${formatNumber(count)} items`;
}
