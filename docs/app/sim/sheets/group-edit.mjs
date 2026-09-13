// Editing a manual expense group: its name, category and member items
// (a simplified version of the app's receipt review sheet used by
// components/daili/expenses/ExpenseGroupEditSheet.tsx).

import { findExpenseGroupLabel } from "../budget.mjs";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyEditInput,
  sanitizeCurrencyInput,
} from "../format.mjs";
import { expenseCategories, readableCategoryColor } from "../themes.mjs";
import {
  button,
  categoryGrid,
  currencyInput,
  h,
  iconButton,
  inlineActionButton,
  primaryButton,
  textInput,
} from "../ui.mjs";

export function openGroupEditSheet(ctx, { date, group }) {
  const profile = ctx.profile;
  ctx.host.sheet({
    className: "s-expense-sheet",
    render(close) {
      // The field starts from whichever member carries the name, matching
      // the card's label, so saving never silently erases it.
      let label = findExpenseGroupLabel(group.members) ?? "";
      let category = group.category;
      // Each draft keeps its member's exact amount so an untouched field
      // survives a currency whose display precision would round it.
      const items = group.members.map((member) => ({
        amount: formatCurrencyInput(member.amount, profile),
        description: member.label,
        expenseId: member.id,
        original: member.amount,
      }));
      const list = h("div", { class: "s-line-items" });
      const totalLine = h("p", { class: "s-line-items-total" });
      const save = primaryButton({
        label: "Save changes",
        onClick: () => submit(),
      });
      const parsedItems = () =>
        items.map(({ original, ...item }) => ({
          ...item,
          amount: parseCurrencyEditInput(item.amount, original, profile),
        }));
      const canSave = () => {
        const parsed = parsedItems();
        return (
          parsed.length > 0 &&
          parsed.every(
            (item) =>
              item.description.trim().length > 0 &&
              Number.isFinite(item.amount) &&
              item.amount >= 0,
          )
        );
      };
      const submit = () => {
        if (!canSave()) return;
        ctx.store.actions.updateExpenseGroup(date, group.id, {
          category,
          label,
          lineItems: parsedItems(),
        });
        close();
      };
      const refresh = () => {
        save.setDisabled(!canSave());
        const total = parsedItems().reduce(
          (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
          0,
        );
        totalLine.textContent = `Group total ${formatCurrency(total, profile)}`;
      };
      const renderItems = () => {
        list.replaceChildren(
          ...items.map((item, index) => {
            const amount = currencyInput({
              ariaLabel: `Item ${index + 1} amount`,
              onChange: (value) => {
                item.amount = value;
                refresh();
              },
              profile,
              sanitize: sanitizeCurrencyInput,
              size: "small",
              value: item.amount,
            });
            return h(
              "div",
              { class: "s-line-item" },
              textInput({
                ariaLabel: `Item ${index + 1} description`,
                className: "s-line-item-description",
                onChange: (value) => {
                  item.description = value;
                  refresh();
                },
                placeholder: `Item ${index + 1}`,
                value: item.description,
              }),
              amount.el,
              iconButton({
                ariaLabel: `Remove line item ${index + 1}`,
                fontSize: 22,
                glyph: "×",
                onClick: () => {
                  items.splice(index, 1);
                  renderItems();
                  refresh();
                },
                size: 32,
              }),
            );
          }),
        );
      };
      renderItems();
      refresh();
      return h(
        "div",
        { class: "s-sheet-scroll" },
        h(
          "div",
          { class: "s-sheet-header" },
          h(
            "div",
            null,
            h("h2", { class: "s-sheet-title" }, "Edit group"),
            h(
              "p",
              { class: "s-hint" },
              "Changes apply to every expense in this group.",
            ),
          ),
          iconButton({
            ariaLabel: "Close group editor",
            fontSize: 26,
            glyph: "×",
            lineHeight: 28,
            onClick: () => close(),
            size: 32,
          }),
        ),
        h(
          "div",
          { class: "s-field-gap" },
          h("p", { class: "s-field-label" }, "Group name"),
          textInput({
            ariaLabel: "Group name",
            onChange: (value) => {
              label = value;
            },
            placeholder: "Group",
            value: label,
          }),
        ),
        h("p", { class: "s-field-label" }, "Category"),
        categoryGrid({
          labelColor: (category) =>
            readableCategoryColor(category, ctx.theme.surface),
          categories: expenseCategories,
          onChange: (value) => {
            category = value || "other";
          },
          selected: category,
        }).el,
        h("p", { class: "s-field-label" }, "Items"),
        list,
        h(
          "div",
          { class: "s-line-items-footer" },
          inlineActionButton({
            ariaLabel: "Add line item",
            label: "Add item",
            onClick: () => {
              items.push({ amount: "", description: "" });
              renderItems();
              refresh();
            },
            trailingSymbol: "+",
          }).el,
          totalLine,
        ),
        save.el,
        button(
          { class: "s-inline-action", onClick: () => close() },
          h("span", { class: "s-inline-action-label" }, "Cancel"),
        ),
      );
    },
  });
}
