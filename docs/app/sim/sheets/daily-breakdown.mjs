// "How this day adds up": the selected day's allowance, rollover and spending,
// and its transactions (components/daili/budget/DailyBudgetDetails.tsx).

import { formatDateKey } from "../budget.mjs";
import { formatCurrency, formatFullDate } from "../format.mjs";
import { getExpenseCategoryMeta } from "../themes.mjs";
import { button, h, iconButton, sectionCard } from "../ui.mjs";

function budgetRow(label, value, extraClass = "") {
  return h(
    "div",
    { class: `s-budget-row${extraClass ? ` ${extraClass}` : ""}` },
    h("span", { class: "s-budget-label" }, label),
    h("span", { class: "s-budget-value" }, value),
  );
}

export function pageHeader({ close, closeLabel, eyebrow, subtitle, title }) {
  return h(
    "div",
    { class: "s-page-header" },
    h(
      "div",
      { class: "s-page-header-copy" },
      h("p", { class: "s-page-eyebrow" }, eyebrow),
      h("h2", { class: "s-page-title" }, title),
      subtitle ? h("p", { class: "s-page-subtitle" }, subtitle) : null,
    ),
    iconButton({
      ariaLabel: closeLabel,
      className: "s-page-close",
      color: "rgba(255,255,255,0.82)",
      fontSize: 28,
      glyph: "×",
      lineHeight: 30,
      onClick: () => close(),
      pressedBackground: "rgba(255,255,255,0.12)",
      size: 44,
    }),
  );
}

export function openDailyBreakdown(
  ctx,
  {
    dailyBudget,
    expenses,
    hasData,
    hasPlan,
    rollover,
    selectedDate,
    totalSpent,
  },
) {
  const profile = ctx.profile;
  const remaining = dailyBudget + rollover - totalSpent;
  ctx.host.sheet({
    render(close) {
      const calculation = sectionCard({ title: "How this day adds up" });
      if (hasPlan && hasData) {
        calculation.append(
          budgetRow("Daily allowance", formatCurrency(dailyBudget, profile)),
          budgetRow(
            rollover < 0 ? "Prior-day overspend" : "Rollover carried in",
            rollover > 0
              ? `+${formatCurrency(rollover, profile)}`
              : formatCurrency(rollover, profile),
          ),
        );
      } else {
        calculation.append(
          h(
            "div",
            { class: "s-unavailable" },
            h(
              "p",
              { class: "s-unavailable-title" },
              hasPlan ? "No Data Yet!" : "Historical plan unavailable",
            ),
            h(
              "p",
              { class: "s-hint" },
              hasPlan
                ? "This day is before your recorded budget history."
                : "Daili did not store the plan that applied this month. Current settings are not used to rewrite history.",
            ),
          ),
        );
      }
      calculation.append(
        budgetRow("Total spent", formatCurrency(totalSpent, profile)),
      );
      if (hasPlan && hasData) {
        calculation.append(
          h(
            "div",
            { class: "s-budget-result" },
            h(
              "div",
              { class: "s-budget-row" },
              h(
                "span",
                { class: "s-budget-result-label" },
                remaining < 0 ? "Over budget" : "Remaining",
              ),
              h(
                "span",
                {
                  class: `s-budget-result-amount${remaining < 0 ? " is-over" : ""}`,
                },
                formatCurrency(remaining, profile),
              ),
            ),
            h(
              "p",
              { class: "s-hint" },
              "Daily allowance + rollover − spending",
            ),
          ),
        );
      }
      const list = sectionCard({ title: "Expenses for this day" });
      if (expenses.length === 0) {
        list.append(
          h(
            "p",
            { class: "s-empty-text" },
            "No expenses recorded for this day.",
          ),
        );
      } else {
        list.append(
          h(
            "div",
            { class: "s-transactions" },
            ...expenses.map((expense) => {
              const category = getExpenseCategoryMeta(expense.category);
              return button(
                {
                  "aria-label": `View ${expense.label} details, ${category.label}, ${expense.time}, ${formatCurrency(expense.amount, profile)}`,
                  class: "s-transaction-row",
                  onClick: () => {
                    close();
                    ctx.openExpenseDetails(
                      expense,
                      formatDateKey(selectedDate),
                    );
                  },
                },
                h(
                  "span",
                  { class: "s-transaction-copy" },
                  h("span", { class: "s-transaction-label" }, expense.label),
                  h(
                    "span",
                    { class: "s-transaction-meta" },
                    `${category.label} · ${expense.time}`,
                  ),
                ),
                h(
                  "span",
                  { class: "s-transaction-amount" },
                  formatCurrency(expense.amount, profile),
                ),
                h(
                  "span",
                  { "aria-hidden": "true", class: "s-transaction-chevron" },
                  "›",
                ),
              );
            }),
          ),
        );
      }
      return h(
        "div",
        { class: "s-page" },
        pageHeader({
          close,
          closeLabel: "Close daily budget breakdown",
          eyebrow: "Daily budget breakdown",
          title: formatFullDate(selectedDate),
        }),
        h("div", { class: "s-page-body s-scroll" }, calculation, list),
      );
    },
  });
}
