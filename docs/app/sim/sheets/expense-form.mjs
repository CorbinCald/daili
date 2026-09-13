// The add and edit expense sheets (components/daili/expenses/AddExpenseSheet.tsx
// and EditExpenseSheet.tsx): amount, description, optional picture, category
// chips and a primary action that stays disabled until the amount is valid.

import { formatDateKey, parseDateKey } from "../budget.mjs";
import {
  formatCurrency,
  formatCurrencyInput,
  isPositiveAmount,
  isUnchangedCurrencyAmount,
  parseCurrencyEditInput,
  sanitizeCurrencyInput,
} from "../format.mjs";
import {
  expenseCategories,
  getExpenseCategoryMeta,
  readableCategoryColor,
} from "../themes.mjs";
import {
  button,
  categoryGrid,
  currencyInput,
  h,
  iconButton,
  illustratedIcon,
  primaryButton,
  textInput,
} from "../ui.mjs";

function sheetHeader(title, closeLabel, close) {
  return h(
    "div",
    { class: "s-sheet-header" },
    h("h2", { class: "s-sheet-title" }, title),
    iconButton({
      ariaLabel: closeLabel,
      className: "s-sheet-close",
      fontSize: 26,
      glyph: "×",
      lineHeight: 28,
      onClick: () => close(),
      size: 32,
    }),
  );
}

/**
 * Shared editable state of both sheets: amount text, label and category with
 * the submit fallbacks (category "other", label from the category).
 */
function createExpenseFields({
  initialAmount = "",
  initialCategory = "",
  initialLabel = "",
  originalAmount,
  profile,
}) {
  const fields = {
    amount: initialAmount,
    category: initialCategory,
    label: initialLabel,
  };
  return {
    fields,
    amountNumber: () =>
      parseCurrencyEditInput(fields.amount, originalAmount, profile),
    hasValidAmount() {
      const amount = this.amountNumber();
      return (
        isPositiveAmount(amount, profile) ||
        isUnchangedCurrencyAmount(amount, originalAmount)
      );
    },
    submitted() {
      const category = fields.category || "other";
      return {
        amount: this.amountNumber(),
        category,
        label: fields.label.trim() || getExpenseCategoryMeta(category).label,
      };
    },
  };
}

export function openAddExpenseSheet(ctx, { date }) {
  const profile = ctx.profile;
  ctx.host.sheet({
    className: "s-expense-sheet",
    render(close) {
      const form = createExpenseFields({ profile });
      const submit = () => {
        if (!form.hasValidAmount()) return;
        ctx.store.actions.addExpense(date, form.submitted());
        close();
      };
      const amount = currencyInput({
        ariaLabel: "Expense amount",
        autoFocus: true,
        onChange: (value) => {
          form.fields.amount = value;
          refresh();
        },
        onSubmit: submit,
        profile,
        sanitize: sanitizeCurrencyInput,
      });
      const label = textInput({
        ariaLabel: "Expense description",
        onChange: (value) => {
          form.fields.label = value;
        },
        onSubmit: submit,
        placeholder: "What did you spend on?",
      });
      const picture = button(
        {
          "aria-label": "Take expense picture",
          class: "s-picture-button",
          onClick: () => ctx.showUnavailable("camera"),
        },
        h(
          "span",
          { class: "s-picture-preview" },
          illustratedIcon("action-camera.png", 38),
        ),
        h(
          "span",
          { class: "s-picture-text" },
          h("span", { class: "s-picture-title" }, "Take picture"),
          h(
            "span",
            { class: "s-picture-hint" },
            "Attach a receipt or item photo",
          ),
        ),
      );
      const grid = categoryGrid({
        labelColor: (category) =>
          readableCategoryColor(category, ctx.theme.surface),
        categories: expenseCategories,
        onChange: (value) => {
          form.fields.category = value;
        },
      });
      const action = primaryButton({
        disabled: true,
        label: `Add ${formatCurrency(0, profile)}`,
        onClick: submit,
      });
      const refresh = () => {
        const valid = form.hasValidAmount();
        amount.setActive(valid);
        action.setDisabled(!valid);
        action.setLabel(
          `Add ${formatCurrency(valid ? form.amountNumber() : 0, profile)}`,
        );
      };
      return h(
        "div",
        { class: "s-sheet-scroll" },
        sheetHeader("Add expense", "Close add expense form", close),
        h("div", { class: "s-field-gap" }, amount.el),
        h("div", { class: "s-field-gap" }, label),
        h("div", { class: "s-field-gap s-picture-wrap" }, picture),
        grid.el,
        action.el,
      );
    },
  });
}

export function openEditExpenseSheet(ctx, { dateKey, expense, onSaved }) {
  const profile = ctx.profile;
  ctx.host.sheet({
    className: "s-expense-sheet",
    render(close) {
      const form = createExpenseFields({
        initialAmount: formatCurrencyInput(expense.amount, profile),
        initialCategory: expense.category,
        initialLabel: expense.label,
        originalAmount: expense.amount,
        profile,
      });
      let dateText = parseDateKey(dateKey) ? dateKey : formatDateKey(ctx.now());
      const submit = () => {
        const parsedDate = parseDateKey(dateText);
        if (!form.hasValidAmount() || !parsedDate) return;
        const saved = ctx.store.actions.updateExpense(
          expense.id,
          parsedDate,
          form.submitted(),
        );
        if (saved === false) return;
        close();
        onSaved?.(parsedDate);
      };
      const amount = currencyInput({
        ariaLabel: "Expense amount",
        isActive: true,
        onChange: (value) => {
          form.fields.amount = value;
          refresh();
        },
        onSubmit: submit,
        profile,
        sanitize: sanitizeCurrencyInput,
        value: form.fields.amount,
      });
      const label = textInput({
        ariaLabel: "Expense description",
        onChange: (value) => {
          form.fields.label = value;
        },
        onSubmit: submit,
        placeholder: "What did you spend on?",
        value: form.fields.label,
      });
      const dateError = h(
        "p",
        { class: "s-field-error", hidden: true },
        "Use a valid date in YYYY-MM-DD format.",
      );
      const dateInput = textInput({
        ariaLabel: "Expense date",
        onChange: (value) => {
          dateText = value;
          refresh();
        },
        onSubmit: submit,
        placeholder: "YYYY-MM-DD",
        value: dateText,
      });
      const grid = categoryGrid({
        labelColor: (category) =>
          readableCategoryColor(category, ctx.theme.surface),
        categories: expenseCategories,
        onChange: (value) => {
          form.fields.category = value;
        },
        selected: form.fields.category,
      });
      const action = primaryButton({ label: "Save expense", onClick: submit });
      const refresh = () => {
        const validDate = parseDateKey(dateText) !== null;
        const showError = dateText.length > 0 && !validDate;
        dateError.hidden = !showError;
        dateInput.classList.toggle("is-error", showError);
        amount.setActive(form.hasValidAmount());
        action.setDisabled(!(form.hasValidAmount() && validDate));
      };
      refresh();
      return h(
        "div",
        { class: "s-sheet-scroll" },
        sheetHeader("Edit expense", "Close edit expense form", close),
        h("div", { class: "s-field-gap" }, amount.el),
        h("div", { class: "s-field-gap" }, label),
        h(
          "div",
          { class: "s-field-gap" },
          h("p", { class: "s-field-label" }, "Date"),
          dateInput,
          dateError,
        ),
        grid.el,
        action.el,
      );
    },
  });
}
