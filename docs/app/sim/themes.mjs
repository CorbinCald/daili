// The six palettes, expense categories and recurring-expense swatches of the
// Android app, copied from constants/themes.ts and constants/expenseCategories.ts
// so the simulated screens paint with the same tokens as the real ones.

const semantic = {
  danger: "#b91c1c",
  dangerLight: "#fda8a8",
  warning: "#c2410c",
  warningFill: "#d4a000",
  successLight: "#6ee7b7",
};

export const themes = {
  matcha: {
    name: "matcha",
    label: "Matcha Morning",
    primary: "#23402f",
    primaryPressed: "#345843",
    onPrimaryMuted: "#b6c0ba",
    accent: "#7fb069",
    onAccent: "#23402f",
    accentDeep: "#4f7942",
    accentLight: "#c3ddb4",
    accentSoft: "#dcead2",
    background: "#faf6ee",
    backgroundTint: "#f1ead9",
    surface: "#ffffff",
    surfaceMuted: "#f7f5ef",
    border: "#e6e2d6",
    track: "#efece1",
    text: "#23402f",
    textSoft: "#4f6b58",
    muted: "#647266",
    faint: "#69736a",
    silent: "#898c89",
    ...semantic,
  },
  terracotta: {
    name: "terracotta",
    label: "Terracotta Dusk",
    primary: "#7c3a2d",
    primaryPressed: "#934c3c",
    onPrimaryMuted: "#e2d4d1",
    accent: "#e88d5d",
    onAccent: "#5a2c22",
    accentDeep: "#aa5633",
    accentLight: "#f5cbb2",
    accentSoft: "#f7ddcc",
    background: "#faf3ec",
    backgroundTint: "#f6e8da",
    surface: "#fffdf9",
    surfaceMuted: "#f7efe6",
    border: "#ecdccf",
    track: "#f3e8db",
    text: "#5c2e24",
    textSoft: "#7c5044",
    muted: "#85665b",
    faint: "#7f6961",
    silent: "#908681",
    ...semantic,
  },
  tide: {
    name: "tide",
    label: "Deep Tide",
    primary: "#0e2a3f",
    primaryPressed: "#1d4259",
    onPrimaryMuted: "#9da9b1",
    accent: "#2ec4b6",
    onAccent: "#0e2a3f",
    accentDeep: "#1b7e75",
    accentLight: "#a8e8e2",
    accentSoft: "#d2f0ed",
    background: "#f2f7f9",
    backgroundTint: "#e3eff2",
    surface: "#ffffff",
    surfaceMuted: "#f4f8fa",
    border: "#dde7ec",
    track: "#e9f0f3",
    text: "#0e2a3f",
    textSoft: "#38566b",
    muted: "#5d717c",
    faint: "#67737b",
    silent: "#878d91",
    ...semantic,
  },
  moonlight: {
    name: "moonlight",
    label: "Moonlight",
    primary: "#0b1320",
    primaryPressed: "#152238",
    onPrimaryMuted: "#8f9399",
    accent: "#7dd3fc",
    onAccent: "#0b1320",
    accentDeep: "#38bdf8",
    accentLight: "#bae6fd",
    accentSoft: "#153246",
    background: "#070b12",
    backgroundTint: "#0f172a",
    surface: "#111827",
    surfaceMuted: "#182235",
    border: "#253044",
    track: "#1e293b",
    text: "#e5f3ff",
    textSoft: "#c6d7e5",
    muted: "#8ea7ba",
    faint: "#798b9b",
    silent: "#636f7e",
    danger: "#fb7185",
    dangerLight: "#fecdd3",
    warning: "#fbbf24",
    warningFill: "#fbbf24",
    successLight: "#5eead4",
  },
  parana: {
    name: "parana",
    label: "Paraná",
    primary: "#031b18",
    primaryPressed: "#0a2d28",
    onPrimaryMuted: "#8d9897",
    accent: "#34d399",
    onAccent: "#031b18",
    accentDeep: "#10b981",
    accentLight: "#a7f3d0",
    accentSoft: "#12352c",
    background: "#04100e",
    backgroundTint: "#0b1f1b",
    surface: "#0d1b18",
    surfaceMuted: "#132620",
    border: "#244138",
    track: "#1c312b",
    text: "#ecfdf5",
    textSoft: "#c8e6da",
    muted: "#89afa1",
    faint: "#719084",
    silent: "#60726a",
    danger: "#f87171",
    dangerLight: "#fecaca",
    warning: "#f59e0b",
    warningFill: "#f59e0b",
    successLight: "#6ee7b7",
  },
  geothermal: {
    name: "geothermal",
    label: "Geothermal",
    primary: "#1a0f0b",
    primaryPressed: "#2c1b14",
    onPrimaryMuted: "#96918f",
    accent: "#f97316",
    onAccent: "#1a0f0b",
    accentDeep: "#ea580c",
    accentLight: "#fdba74",
    accentSoft: "#3b2114",
    background: "#0b0908",
    backgroundTint: "#19110d",
    surface: "#15100e",
    surfaceMuted: "#211815",
    border: "#3a2a23",
    track: "#2a1d18",
    text: "#fff7ed",
    textSoft: "#f3d9c4",
    muted: "#b6927c",
    faint: "#967d6f",
    silent: "#74655d",
    danger: "#ef4444",
    dangerLight: "#fca5a5",
    warning: "#f59e0b",
    warningFill: "#f59e0b",
    successLight: "#86efac",
  },
};

export const themeNames = Object.keys(themes);
export const defaultThemeName = "tide";

export function normalizeThemeName(value, fallback = defaultThemeName) {
  return typeof value === "string" && value in themes ? value : fallback;
}

export const darkThemeNames = new Set(["moonlight", "parana", "geothermal"]);

export const expenseCategories = [
  { id: "food", label: "Food", icon: "category-food.png", color: "#f97316" },
  {
    id: "coffee",
    label: "Coffee",
    icon: "category-coffee.png",
    color: "#92400e",
  },
  {
    id: "groceries",
    label: "Groceries",
    icon: "category-groceries.png",
    color: "#16a34a",
  },
  {
    id: "transport",
    label: "Transport",
    icon: "category-transport.png",
    color: "#2563eb",
  },
  {
    id: "utilities",
    label: "Utilities",
    icon: "category-utilities.png",
    color: "#7c3aed",
  },
  { id: "other", label: "Other", icon: "category-other.png", color: "#6b7280" },
];

export function getExpenseCategoryMeta(id) {
  return (
    expenseCategories.find((category) => category.id === id) ??
    expenseCategories[expenseCategories.length - 1]
  );
}

export const recurringColors = [
  "#3db882",
  "#f97316",
  "#2563eb",
  "#7c3aed",
  "#ec4899",
  "#0891b2",
];

/** Fixed-cost lines the guided onboarding turns into recurring expenses. */
export const guidedFixedExpenseFields = [
  { color: "#7c3aed", key: "rentAndUtilities", label: "Rent and utilities" },
  { color: "#2563eb", key: "carExpenses", label: "Car expenses" },
  { color: "#0ea5e9", key: "phoneExpenses", label: "Phone expenses" },
  { color: "#f97316", key: "insurance", label: "Insurance" },
  { color: "#dc2626", key: "loanPayments", label: "Loan payments" },
  {
    color: "#6b7280",
    key: "miscellaneousExpenses",
    label: "Miscellaneous expenses",
  },
];

function hexToLinearRgb(hex) {
  return hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
}

function relativeLuminance(hex) {
  const [red, green, blue] = hexToLinearRgb(hex);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function hexToRgb(hex) {
  return hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16));
}

function rgbToHex(channels) {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** The opaque colour a translucent `foreground` produces over `background`. */
export function compositeColor(foreground, alpha, background) {
  const top = hexToRgb(foreground);
  const bottom = hexToRgb(background);
  return rgbToHex(
    top.map((channel, index) => channel * alpha + bottom[index] * (1 - alpha)),
  );
}

/** WCAG 2.x contrast ratio between two opaque hex colours. */
export function contrastRatio(foreground, background) {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Nudges a colour toward white on dark backgrounds, or black on light ones,
 * until it reads at the given ratio. The phone keeps the app's palette but the
 * page's accessibility check demands AA for small text in every theme.
 */
export function ensureContrast(color, background, minimum = 4.5) {
  const towards = relativeLuminance(background) < 0.18 ? "#ffffff" : "#000000";
  let candidate = color;
  for (
    let step = 0;
    step < 24 && contrastRatio(candidate, background) < minimum;
    step += 1
  ) {
    candidate = compositeColor(towards, 0.06, candidate);
  }
  return candidate;
}

/** The smallest white alpha (from `floor`) that reads at `minimum` over `background`. */
function readableWhiteAlpha(background, floor, minimum = 4.5) {
  let alpha = floor;
  while (
    alpha < 1 &&
    contrastRatio(compositeColor("#ffffff", alpha, background), background) <
      minimum
  ) {
    alpha = Math.round((alpha + 0.02) * 100) / 100;
  }
  return Math.min(1, alpha);
}

/**
 * Text colour for a category label on its tinted chip or pill: the category's
 * own hue, adjusted until it reads against the 8% tint over `surface`.
 */
export function readableCategoryColor(category, surface) {
  return ensureContrast(
    category.color,
    compositeColor(category.color, 0.08, surface),
  );
}

/** Picks the candidate text colour with the highest contrast on the background. */
export function getReadableTextColor(backgroundColor, textColors) {
  return textColors.reduce((best, color) =>
    contrastRatio(color, backgroundColor) > contrastRatio(best, backgroundColor)
      ? color
      : best,
  );
}

/** The CSS custom properties one theme paints onto the simulated phone. */
export function themeVariables(theme) {
  const disabledButtonText = getReadableTextColor(theme.accentSoft, [
    theme.text,
    theme.primary,
    "#ffffff",
  ]);
  const dangerOnSoft =
    contrastRatio(theme.danger, theme.accentSoft) >= 4.5
      ? theme.danger
      : getReadableTextColor(theme.accentSoft, [
          theme.danger,
          theme.dangerLight,
        ]);
  // The header card is a 10% white wash over the primary surface.
  const headerCard = compositeColor("#ffffff", 0.1, theme.primary);
  return {
    "--on-card-muted": `rgba(255, 255, 255, ${readableWhiteAlpha(headerCard, 0.55)})`,
    "--on-primary-soft": `rgba(255, 255, 255, ${readableWhiteAlpha(theme.primary, 0.64)})`,
    "--success-on-card": ensureContrast(theme.successLight, headerCard),
    "--danger-on-card": ensureContrast(theme.dangerLight, headerCard),
    "--accent-deep-on-soft": ensureContrast(theme.accentDeep, theme.accentSoft),
    "--accent-deep-on-tint": ensureContrast(
      theme.accentDeep,
      theme.backgroundTint,
    ),
    "--primary": theme.primary,
    "--primary-pressed": theme.primaryPressed,
    "--on-primary-muted": theme.onPrimaryMuted,
    "--accent": theme.accent,
    "--on-accent": theme.onAccent,
    "--accent-deep": theme.accentDeep,
    "--accent-light": theme.accentLight,
    "--accent-soft": theme.accentSoft,
    "--background": theme.background,
    "--background-tint": theme.backgroundTint,
    "--surface": theme.surface,
    "--surface-muted": theme.surfaceMuted,
    "--border": theme.border,
    "--track": theme.track,
    "--text": theme.text,
    "--text-soft": theme.textSoft,
    "--muted": theme.muted,
    "--faint": theme.faint,
    "--silent": theme.silent,
    "--danger": theme.danger,
    "--danger-light": theme.dangerLight,
    "--warning": theme.warning,
    "--warning-fill": theme.warningFill,
    "--success-light": theme.successLight,
    "--disabled-button-text": disabledButtonText,
    "--danger-on-soft": dangerOnSoft,
    "--danger-chip-text": getReadableTextColor(theme.danger, [
      theme.background,
      theme.primary,
      theme.text,
    ]),
    "--warning-chip-text": getReadableTextColor(theme.warningFill, [
      theme.background,
      theme.primary,
      theme.text,
    ]),
  };
}
