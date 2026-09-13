// Recurring expense form and its edit sheet (components/daili/budget/RecurringExpenseForm.tsx
// and EditRecurringExpenseSheet.tsx).

import {
  formatCurrencyInput,
  isPositiveAmount,
  isUnchangedCurrencyAmount,
  parseCurrencyEditInput,
  sanitizeCurrencyInput,
} from "../format.mjs";
import { recurringColors } from "../themes.mjs";
import {
  button,
  currencyInput,
  h,
  inlineActionButton,
  primaryButton,
  textInput,
} from "../ui.mjs";

/** A fresh form for one add or edit session so cancelled drafts never leak. */
export function recurringExpenseForm({
  initialDraft,
  initialExpense,
  onCancel,
  onDraftChange,
  onSave,
  profile,
  submitLabel,
}) {
  let label = initialDraft?.label ?? initialExpense?.label ?? "";
  let amountText =
    initialDraft?.amount ??
    (initialExpense ? formatCurrencyInput(initialExpense.amount, profile) : "");
  let color =
    initialDraft?.color ?? initialExpense?.color ?? recurringColors[0];
  // Inline forms are rebuilt whenever their screen re-renders, so the draft
  // is reported to the owner, who hands it back as `initialDraft`.
  const publishDraft = () =>
    onDraftChange?.({ amount: amountText, color, label });
  const parsed = () =>
    parseCurrencyEditInput(amountText, initialExpense?.amount, profile);
  const hasValidAmount = () =>
    isPositiveAmount(parsed(), profile) ||
    isUnchangedCurrencyAmount(parsed(), initialExpense?.amount);
  const canSave = () => label.trim().length > 0 && hasValidAmount();
  const submit = () => {
    if (!canSave()) return;
    const saved = onSave({ amount: parsed(), color, label: label.trim() });
    if (saved !== false) onCancel();
  };
  const labelInput = textInput({
    ariaLabel: "Expense description",
    className: "s-recurring-input",
    onChange: (value) => {
      label = value;
      publishDraft();
      refresh();
    },
    onSubmit: submit,
    placeholder: "e.g. Netflix, Rent, Gym...",
    value: label,
  });
  const amount = currencyInput({
    ariaLabel: "Expense amount",
    backgroundClass: "is-on-surface",
    onChange: (value) => {
      amountText = value;
      publishDraft();
      refresh();
    },
    onSubmit: submit,
    profile,
    sanitize: sanitizeCurrencyInput,
    size: "small",
    value: amountText,
  });
  const swatches = recurringColors.map((candidate) =>
    button(
      {
        "aria-label": `Use color ${candidate}`,
        "aria-pressed": String(candidate === color),
        class: "s-color-target",
        onClick: () => {
          color = candidate;
          publishDraft();
          paintColors();
        },
      },
      h("span", { class: "s-color-swatch", style: { background: candidate } }),
    ),
  );
  const paintColors = () =>
    swatches.forEach((swatch, index) => {
      const active = recurringColors[index] === color;
      swatch.classList.toggle("is-selected", active);
      swatch.setAttribute("aria-pressed", String(active));
    });
  const save = primaryButton({
    label: submitLabel,
    onClick: submit,
    size: "small",
  });
  const cancel = inlineActionButton({ label: "Cancel", onClick: onCancel });
  const refresh = () => {
    amount.setActive(hasValidAmount());
    save.setDisabled(!canSave());
  };
  refresh();
  paintColors();
  return h(
    "div",
    { class: "s-recurring-form" },
    labelInput,
    amount.el,
    h("div", { class: "s-color-row" }, ...swatches),
    save.el,
    cancel.el,
  );
}

export function openEditRecurringSheet(ctx, { expense }) {
  ctx.host.sheet({
    render(close) {
      return h(
        "div",
        { class: "s-sheet-scroll" },
        h(
          "h2",
          { class: "s-sheet-title s-sheet-title-block" },
          `Edit ${expense.label}`,
        ),
        recurringExpenseForm({
          initialExpense: expense,
          onCancel: () => close(),
          onSave: (input) =>
            ctx.store.actions.updateRecurringExpense(expense.id, input),
          profile: ctx.profile,
          submitLabel: "Save changes",
        }),
      );
    },
  });
}
