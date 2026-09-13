// The Settings tab (components/daili/screens/SettingsScreen.tsx): six grouped
// sections from the numbers every screen depends on (Budget) down to the app
// itself (About).

import {
  NOTIFICATION_TIME_STEP_MINUTES,
  notificationTimeToDate,
  resolveMonthlyBudgetPlan,
  shiftNotificationTime,
} from "../budget.mjs";
import {
  formatBytes,
  formatClockTime,
  formatCurrency,
  formatCurrencyInput,
  formatMebibytes,
  formatNumber,
  isBudgetAmount,
  parseCurrencyEditInput,
  sanitizeCurrencyInput,
} from "../format.mjs";
import { themeNames, themes } from "../themes.mjs";
import {
  append,
  button,
  buttonGroup,
  currencyInput,
  h,
  icon,
  inlineActionButton,
  toggleSwitch,
} from "../ui.mjs";
import { openCurrencyDialog } from "../sheets/currency.mjs";
import { openConfirmDialog } from "../sheets/dialogs.mjs";

/** Download sizes the app discloses for its optional on-device models. */
export const RECEIPT_OCR_MODEL_BYTES = 31040715;
export const SPEECH_TINY_MODEL_BYTES = 51134611;
export const SPEECH_SMALL_MODEL_BYTES = 89295019;

const PRIVACY_POLICY_URL = "https://corbincald.github.io/daili/";
const MODEL_NOTICES_URL =
  "https://corbincald.github.io/daili/model-notices.html";

function settingsGroup({ description, iconName, title }, ...rows) {
  return h(
    "section",
    { class: "s-settings-group" },
    h(
      "div",
      { class: "s-settings-heading" },
      h(
        "div",
        { class: "s-settings-title-row" },
        h(
          "span",
          { class: "s-settings-badge" },
          icon(iconName, { size: 18, className: "s-settings-badge-icon" }),
        ),
        h("h3", { class: "s-settings-group-title" }, title),
      ),
      description
        ? h("p", { class: "s-settings-description" }, description)
        : null,
    ),
    h("div", { class: "s-settings-container" }, ...rows),
  );
}

function rowText({ badge, headline, supporting, tone = "default" }) {
  return h(
    "span",
    { class: "s-row-text" },
    h(
      "span",
      { class: "s-row-headline-row" },
      h(
        "span",
        { class: `s-row-headline${tone === "danger" ? " is-danger" : ""}` },
        headline,
      ),
      badge ? h("span", { class: "s-row-badge" }, badge) : null,
    ),
    supporting ? h("span", { class: "s-row-supporting" }, supporting) : null,
  );
}

function settingsRow({
  ariaLabel,
  children = [],
  headline,
  onPress,
  supporting,
  tone = "default",
  trailing,
}) {
  const main = h(
    "span",
    { class: "s-row-main" },
    rowText({ headline, supporting, tone }),
    trailing ? h("span", { class: "s-row-trailing" }, trailing) : null,
  );
  if (!onPress)
    return h(
      "div",
      { class: "s-settings-row s-settings-surface" },
      main,
      ...children,
    );
  return h(
    "div",
    { class: "s-settings-surface" },
    button(
      {
        "aria-label": ariaLabel,
        class: `s-settings-row is-pressable${tone === "danger" ? " is-danger" : ""}`,
        onClick: onPress,
      },
      main,
      ...children,
    ),
  );
}

function toggleRow({
  ariaLabel,
  badge,
  children = [],
  disabled,
  headline,
  onChange,
  supporting,
  value,
}) {
  const control = toggleSwitch({
    ariaLabel,
    disabled,
    label: rowText({ badge, headline, supporting }),
    onChange,
    value,
  });
  control.el.classList.add("s-settings-row", "is-toggle");
  return h(
    "div",
    { class: "s-settings-surface" },
    control.el,
    children.length > 0
      ? h("div", { class: "s-row-extras" }, ...children)
      : null,
  );
}

function linkRow({ ariaLabel, headline, href, supporting }) {
  return h(
    "div",
    { class: "s-settings-surface" },
    h(
      "a",
      {
        "aria-label": ariaLabel,
        class: "s-settings-row is-pressable",
        href,
        rel: "noopener",
        target: "_blank",
      },
      h(
        "span",
        { class: "s-row-main" },
        rowText({ headline, supporting }),
        h(
          "span",
          { class: "s-row-trailing" },
          icon("open-outline", { size: 18, className: "s-row-link-icon" }),
        ),
      ),
    ),
  );
}

function amountRow({
  ctx,
  current,
  headline,
  onSave,
  placeholder,
  supporting,
  allowNegative = false,
  nonNegative = false,
  extras = () => [],
}) {
  const profile = ctx.profile;
  // Unsaved text is kept in UI state, keyed by the row, so a re-render of the
  // screen (another setting changing) does not discard it. A draft is only
  // reused while the saved value it was typed over is unchanged.
  const drafts = ctx.ui.settings.drafts;
  const savedText = formatCurrencyInput(current, profile);
  const draft = drafts[headline];
  let text = draft && draft.base === savedText ? draft.text : savedText;
  let focused = false;
  const rememberDraft = () => {
    if (text === savedText) delete drafts[headline];
    else drafts[headline] = { base: savedText, text };
  };
  const parsed = () => parseCurrencyEditInput(text, current, profile);
  const valid = () =>
    (nonNegative ? parsed() >= 0 : true) && isBudgetAmount(parsed(), profile);
  const canSave = () => valid() && parsed() !== current;
  const save = inlineActionButton({
    ariaLabel: `Save ${headline.toLowerCase()}`,
    disabled: true,
    label: "Save",
    onClick: () => submit(),
    trailingSymbol: "✓",
  });
  const submit = () => {
    if (!canSave()) return;
    delete drafts[headline];
    onSave(parsed());
  };
  const input = currencyInput({
    allowNegative,
    ariaLabel: headline,
    onChange: (value) => {
      text = value;
      rememberDraft();
      refresh();
    },
    onSubmit: submit,
    placeholder,
    profile,
    sanitize: sanitizeCurrencyInput,
    size: "small",
    value: text,
  });
  input.input.addEventListener("focus", () => {
    focused = true;
    refresh();
  });
  input.input.addEventListener("blur", () => {
    focused = false;
    refresh();
  });
  const extrasWrap = h("div", { class: "s-row-extras-inline" });
  const refresh = () => {
    input.setActive(focused || canSave());
    save.setDisabled(!canSave());
    extrasWrap.replaceChildren();
    append(
      extrasWrap,
      extras({ canSave: canSave(), parsed: parsed(), valid: valid() }),
    );
  };
  refresh();
  return settingsRow({
    children: [
      h(
        "div",
        { class: "s-form-row" },
        h("div", { class: "s-form-input" }, input.el),
        save.el,
      ),
      extrasWrap,
    ],
    headline,
    supporting,
  });
}

function timeStepper({ ctx, label, name, onChange, time }) {
  const formatted = formatClockTime(notificationTimeToDate(time));
  const native = h("input", {
    "aria-label": label,
    class: "s-time-native",
    type: "time",
  });
  native.value = `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
  native.addEventListener("change", () => {
    const [hour, minute] = native.value.split(":").map(Number);
    if (Number.isInteger(hour) && Number.isInteger(minute))
      onChange({ hour, minute });
  });
  const value = button(
    {
      "aria-label": label,
      class: "s-time-segment s-time-value",
      onClick: () => {
        if (typeof native.showPicker === "function") {
          try {
            native.showPicker();
            return;
          } catch {
            // Fall back to focusing the field.
          }
        }
        native.focus();
        native.click();
      },
    },
    formatted,
  );
  return h(
    "div",
    { class: "s-time-row" },
    h("span", { class: "s-time-label" }, label),
    h(
      "div",
      { class: "s-time-stepper" },
      button(
        {
          "aria-label": `Move ${name} time earlier`,
          class: "s-time-segment is-start",
          onClick: () =>
            onChange(
              shiftNotificationTime(time, -NOTIFICATION_TIME_STEP_MINUTES),
            ),
        },
        "−",
      ),
      value,
      button(
        {
          "aria-label": `Move ${name} time later`,
          class: "s-time-segment is-end",
          onClick: () =>
            onChange(
              shiftNotificationTime(time, NOTIFICATION_TIME_STEP_MINUTES),
            ),
        },
        "+",
      ),
      native,
    ),
  );
}

function themeThumbnail(theme) {
  const bar = (className, background, width) =>
    h("span", {
      class: `s-thumb-${className}`,
      style: { background, width: width ? `${width}px` : undefined },
    });
  return h(
    "span",
    { class: "s-thumb-frame", style: { background: theme.primary } },
    h(
      "span",
      { class: "s-thumb-header", style: { background: theme.primary } },
      h("span", { class: "s-thumb-title" }),
      h(
        "span",
        { class: "s-thumb-card", style: { background: theme.surface } },
        bar("eyebrow", theme.muted),
        h(
          "span",
          { class: "s-thumb-amount-row" },
          bar("amount", theme.text),
          bar("spent", theme.muted),
        ),
        h(
          "span",
          { class: "s-thumb-track", style: { background: theme.track } },
          h("span", {
            class: "s-thumb-progress",
            style: { background: theme.accent },
          }),
        ),
      ),
    ),
    h(
      "span",
      { class: "s-thumb-body", style: { background: theme.background } },
      ...[20, 13, 17].map((width) =>
        h(
          "span",
          { class: "s-thumb-list-row", style: { background: theme.surface } },
          bar("list-text", theme.textSoft, width),
          bar("list-amount", theme.muted),
        ),
      ),
      h(
        "span",
        { class: "s-thumb-fab", style: { background: theme.accent } },
        h("span", {
          class: "s-thumb-plus",
          style: { background: theme.onAccent },
        }),
        h("span", {
          class: "s-thumb-plus is-upright",
          style: { background: theme.onAccent },
        }),
      ),
    ),
    h(
      "span",
      { class: "s-thumb-tabs", style: { background: theme.primary } },
      h("span", { class: "s-thumb-tab", style: { background: theme.accent } }),
      h("span", {
        class: "s-thumb-tab",
        style: { background: theme.primaryPressed },
      }),
      h("span", {
        class: "s-thumb-tab",
        style: { background: theme.primaryPressed },
      }),
    ),
  );
}

export function renderSettingsScreen(ctx) {
  const state = ctx.state;
  const profile = ctx.profile;
  const now = ctx.now();
  const currentPlan = resolveMonthlyBudgetPlan(
    state.monthlyBudgetPlans,
    now.getFullYear(),
    now.getMonth(),
  )?.plan;
  const monthlyIncome = currentPlan?.income ?? null;
  const actions = ctx.store.actions;

  const budgetGroup = settingsGroup(
    { iconName: "wallet-outline", title: "Budget" },
    settingsRow({
      ariaLabel: "Currency",
      headline: "Currency",
      onPress: () => openCurrencyDialog(ctx),
      supporting: `${profile.code} · ${profile.symbol}`,
      trailing: icon("chevron-forward", {
        size: 18,
        className: "s-row-chevron",
      }),
    }),
    amountRow({
      // Onboarding can create a negative cap, so editing one keeps its sign.
      allowNegative: true,
      ctx,
      current: state.monthlyBudget,
      extras: ({ canSave, parsed, valid }) => [
        valid && parsed < 0
          ? h(
              "p",
              { class: "s-negative-note" },
              "This is a negative budget, so your daily budget will also be negative.",
            )
          : null,
        state.monthlyBudget === null || !valid || canSave
          ? h(
              "p",
              { class: "s-current-budget" },
              state.monthlyBudget !== null
                ? `Current monthly spending cap: ${formatCurrency(state.monthlyBudget, profile)}`
                : "No monthly spending cap set yet.",
            )
          : null,
      ],
      headline: "Monthly spending cap",
      onSave: (value) => actions.updateMonthlyBudget(value),
      placeholder: formatNumber(2000),
      supporting:
        "This cap includes fixed costs. Daili subtracts them once to calculate your discretionary daily allowance.",
    }),
    state.monthlyBudget !== null || monthlyIncome !== null
      ? amountRow({
          nonNegative: true,
          ctx,
          current: monthlyIncome,
          headline: "Monthly net income",
          onSave: (value) => actions.updateMonthlyIncome(value),
          placeholder: formatNumber(4000),
        })
      : null,
  );

  const notificationGroup = settingsGroup(
    { iconName: "notifications-outline", title: "Notifications" },
    toggleRow({
      ariaLabel: "Toggle Morning Rundown notifications",
      children: state.morningRundownEnabled
        ? [
            timeStepper({
              ctx,
              label: "Morning Rundown time",
              name: "Morning Rundown",
              onChange: (time) =>
                actions.setSetting("morningRundownTime", time),
              time: state.morningRundownTime,
            }),
          ]
        : [],
      headline: "Morning Rundown",
      onChange: (value) => actions.setSetting("morningRundownEnabled", value),
      value: state.morningRundownEnabled,
    }),
    toggleRow({
      ariaLabel: "Toggle daily reminder notifications",
      children: state.notificationsEnabled
        ? [
            timeStepper({
              ctx,
              label: "Daily reminder time",
              name: "daily reminder",
              onChange: (time) => actions.setSetting("dailyReminderTime", time),
              time: state.dailyReminderTime,
            }),
          ]
        : [],
      headline: "Daily reminder",
      onChange: (value) => actions.setSetting("notificationsEnabled", value),
      value: state.notificationsEnabled,
    }),
  );

  const appearanceGroup = settingsGroup(
    { iconName: "color-palette-outline", title: "Appearance" },
    h(
      "div",
      { class: "s-settings-surface" },
      h(
        "div",
        { class: "s-theme-grid", role: "radiogroup", "aria-label": "Theme" },
        ...themeNames.map((name) => {
          const theme = themes[name];
          const selected = name === state.themeName;
          return button(
            {
              "aria-checked": String(selected),
              "aria-label": `Use ${theme.label} theme`,
              class: `s-theme-tile${selected ? " is-selected" : ""}`,
              role: "radio",
              onClick: () => actions.setThemeName(name),
            },
            themeThumbnail(theme),
            h("span", { class: "s-theme-tile-label" }, theme.label),
            selected
              ? icon("checkmark-circle", {
                  size: 18,
                  className: "s-theme-check",
                  contrastColor: theme.surface,
                })
              : null,
          );
        }),
      ),
    ),
  );

  const receiptHint = `Scan a receipt and let Daili extract the merchant, total, and line items for you. Downloads the on-device OCR models (${formatBytes(RECEIPT_OCR_MODEL_BYTES)}) when enabled — everything stays on your device.`;
  const aiGroup = settingsGroup(
    {
      description:
        "Receipt scanning and voice entry use models stored on your phone. They only go online to download those models.",
      iconName: "hardware-chip-outline",
      title: "On-device AI",
    },
    toggleRow({
      ariaLabel: "Toggle on-device receipt OCR",
      headline: "Receipt Expense Extraction",
      onChange: () => ctx.showUnavailable("receipt"),
      supporting: receiptHint,
      value: state.receiptExtractionEnabled,
    }),
    !state.receiptExtractionEnabled
      ? toggleRow({
          ariaLabel: "Toggle Today screen scan button",
          headline: "Scan button on Today screen",
          onChange: (visible) =>
            actions.setSetting("receiptScanButtonHidden", !visible),
          supporting:
            "Keep the floating receipt button visible so you can turn scanning on in one tap.",
          value: !state.receiptScanButtonHidden,
        })
      : null,
    toggleRow({
      ariaLabel: "Toggle voice expense entry",
      badge: "Experimental",
      headline: "Add expenses by voice",
      onChange: () => ctx.showUnavailable("voice"),
      supporting:
        "Tap the mic, say an amount and label, and review a prefilled expense. Downloads the on-device speech model when enabled.",
      value: state.speechEntryEnabled,
    }),
    settingsRow({
      children: [
        buttonGroup({
          ariaLabel: "Voice accuracy",
          onChange: (value) => actions.setSetting("speechModelTier", value),
          options: [
            { label: "Standard", value: "tiny" },
            { label: "More accurate", value: "small" },
          ],
          value: state.speechModelTier,
        }).el,
      ],
      headline: "Voice accuracy",
      supporting: `Standard downloads ${formatMebibytes(SPEECH_TINY_MODEL_BYTES)}. More accurate downloads ${formatMebibytes(SPEECH_SMALL_MODEL_BYTES)} and may use more memory and battery.`,
    }),
  );

  const backupHint = state.androidBackupEnabled
    ? "Android may encrypt and back up your budget, expenses, plans, and settings. Receipt photos and AI models are excluded from cloud backup. Android controls the timing."
    : "Off. Daili will not add your financial data to future Android cloud backups.";
  const dataGroup = settingsGroup(
    {
      description:
        "No ads, no account, and no analytics. Financial data stays on-device unless you choose encrypted Android backup; receipt photos and audio are excluded from cloud backup. AI features only connect to download their models.",
      iconName: "shield-checkmark-outline",
      title: "Data & privacy",
    },
    toggleRow({
      ariaLabel: "Toggle encrypted Android backup",
      headline: "Encrypted Android backup",
      onChange: (value) => {
        if (value) {
          actions.setSetting("androidBackupEnabled", true);
          return;
        }
        openConfirmDialog(ctx, {
          confirmLabel: "Turn off backup",
          message:
            "Future Daili data will not be added to Android cloud backup. An older backup may remain until Android refreshes it or you remove it in system settings.",
          onConfirm: () => actions.setSetting("androidBackupEnabled", false),
          title: "Turn off Android backup?",
        });
      },
      supporting: backupHint,
      value: state.androidBackupEnabled,
    }),
    linkRow({
      ariaLabel: "View Daili privacy policy",
      headline: "Privacy policy",
      href: PRIVACY_POLICY_URL,
    }),
    linkRow({
      ariaLabel: "View Daili model licenses",
      headline: "Model notices",
      href: MODEL_NOTICES_URL,
    }),
  );

  const aboutGroup = settingsGroup(
    { iconName: "information-circle-outline", title: "About" },
    linkRow({
      ariaLabel: "Rate Daili on Google Play",
      headline: "Rate Daili",
      href: ctx.playUrl,
      supporting:
        "A Play Store rating helps other privacy-minded budgeters find Daili.",
    }),
    settingsRow({
      ariaLabel: "Reset Daili and erase all data",
      headline: "Reset app",
      onPress: () =>
        openConfirmDialog(ctx, {
          confirmLabel: "Reset",
          danger: true,
          message:
            "This permanently deletes your budget, expenses, recurring expenses, attached photos, downloaded AI models, and settings. You’ll return to onboarding. This can’t be undone.",
          onConfirm: () => ctx.resetApp(),
          title: "Reset Daili?",
        }),
      supporting:
        "Resetting Daili will permanently erase your budget, expenses, recurring expenses, attached photos, downloaded AI models, and settings. You'll return to onboarding.",
      tone: "danger",
    }),
  );

  return h(
    "div",
    { class: "s-screen s-settings-screen" },
    h(
      "div",
      { class: "s-settings-header" },
      h("h2", { class: "s-screen-title" }, "Settings"),
    ),
    h(
      "div",
      {
        class: "s-scroll s-settings-content",
        dataset: { scrollKey: "settings" },
      },
      budgetGroup,
      notificationGroup,
      appearanceGroup,
      aiGroup,
      dataGroup,
      aboutGroup,
      h("p", { class: "s-settings-footer" }, `Daili ${ctx.appVersion}`),
    ),
  );
}
