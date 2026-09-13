// The month's itemized budget breakdown (components/daili/budget/BudgetBreakdownDetails.tsx).

import { getProratedAmount, parseDateKey } from "../budget.mjs";
import {
  formatCurrency,
  formatMonthName,
  formatMonthYear,
  formatShortMonthDay,
} from "../format.mjs";
import { getExpenseCategoryMeta } from "../themes.mjs";
import { categoryBadge, h, sectionCard } from "../ui.mjs";
import { pageHeader } from "./daily-breakdown.mjs";

function comparisonRow({ amount, color, label, periodBudget, profile }) {
  const share =
    periodBudget <= 0
      ? "No period budget"
      : `${Math.round((amount / periodBudget) * 100)}% of period budget`;
  return h(
    "div",
    { class: "s-comparison-row" },
    h("span", { class: "s-comparison-marker", style: { background: color } }),
    h(
      "span",
      { class: "s-comparison-text" },
      h("span", { class: "s-comparison-label" }, label),
      h("span", { class: "s-comparison-share" }, share),
    ),
    h(
      "span",
      { class: "s-comparison-amount" },
      formatCurrency(amount, profile),
    ),
  );
}

export function openBudgetBreakdown(
  ctx,
  {
    expenseRecords,
    month,
    period,
    periodBudget,
    periodRecurring,
    recurringExpenses,
    totalSpent,
    year,
  },
) {
  const profile = ctx.profile;
  const theme = ctx.theme;
  const discretionary = periodBudget - periodRecurring;
  const remaining = Math.round((discretionary - totalSpent) * 100) / 100;
  const isOver = remaining < 0;
  ctx.host.sheet({
    render(close) {
      const comparison = sectionCard(
        { title: "Period comparison" },
        h(
          "div",
          { class: "s-period-budget-row" },
          h("span", { class: "s-period-budget-label" }, "Period budget"),
          h(
            "span",
            { class: "s-period-budget-amount" },
            formatCurrency(periodBudget, profile),
          ),
        ),
        h(
          "div",
          { class: "s-comparison-rows" },
          comparisonRow({
            amount: periodRecurring,
            color: "#7c3aed",
            label: "Fixed / recurring",
            periodBudget,
            profile,
          }),
          comparisonRow({
            amount: totalSpent,
            color: theme.accent,
            label: "Discretionary spending",
            periodBudget,
            profile,
          }),
        ),
        h(
          "div",
          { class: "s-status-row" },
          h(
            "span",
            { class: "s-status-text" },
            h(
              "span",
              { class: "s-status-label" },
              isOver ? "Over discretionary budget" : "Remaining discretionary",
            ),
            h(
              "span",
              { class: "s-status-hint" },
              "After fixed costs and discretionary spending",
            ),
          ),
          h(
            "span",
            { class: `s-status-amount${isOver ? " is-over" : ""}` },
            formatCurrency(Math.abs(remaining), profile),
          ),
        ),
      );
      const fixed = sectionCard({ title: "Fixed / recurring expenses" });
      if (recurringExpenses.length === 0) {
        fixed.append(
          h("p", { class: "s-empty-text" }, "No fixed or recurring expenses"),
        );
      } else {
        fixed.append(
          h(
            "div",
            { class: "s-detail-list" },
            ...recurringExpenses.map((expense) =>
              h(
                "div",
                { class: "s-detail-row" },
                h("span", {
                  class: "s-recurring-dot is-inset",
                  style: { background: expense.color },
                }),
                h(
                  "span",
                  { class: "s-detail-text" },
                  h("span", { class: "s-detail-label" }, expense.label),
                  period.isPartial
                    ? h(
                        "span",
                        { class: "s-detail-meta" },
                        `Prorated from ${formatCurrency(expense.amount, profile)} monthly`,
                      )
                    : null,
                ),
                h(
                  "span",
                  { class: "s-detail-amount" },
                  formatCurrency(
                    getProratedAmount(expense.amount, period),
                    profile,
                  ),
                ),
              ),
            ),
          ),
        );
      }
      fixed.append(
        h(
          "div",
          { class: "s-total-row" },
          h("span", { class: "s-total-label" }, "Total fixed / recurring"),
          h(
            "span",
            { class: "s-total-amount" },
            formatCurrency(periodRecurring, profile),
          ),
        ),
      );
      const discretionaryCard = sectionCard({
        title: "Discretionary expenses",
      });
      if (expenseRecords.length === 0) {
        discretionaryCard.append(
          h(
            "p",
            { class: "s-empty-text" },
            `No discretionary expenses in ${formatMonthName(month)}`,
          ),
        );
      } else {
        discretionaryCard.append(
          h(
            "div",
            { class: "s-detail-list" },
            ...expenseRecords.map(({ dateKey, expense }) => {
              const category = getExpenseCategoryMeta(expense.category);
              const date = parseDateKey(dateKey);
              return h(
                "div",
                { class: "s-detail-row" },
                categoryBadge(category, { iconSize: 27, radius: 10, size: 34 }),
                h(
                  "span",
                  { class: "s-detail-text" },
                  h("span", { class: "s-detail-label" }, expense.label),
                  h(
                    "span",
                    { class: "s-detail-meta" },
                    `${date ? formatShortMonthDay(date) : dateKey} · ${expense.time}`,
                  ),
                ),
                h(
                  "span",
                  { class: "s-detail-amount" },
                  formatCurrency(expense.amount, profile),
                ),
              );
            }),
          ),
        );
      }
      discretionaryCard.append(
        h(
          "div",
          { class: "s-total-row" },
          h("span", { class: "s-total-label" }, "Total discretionary spending"),
          h(
            "span",
            { class: "s-total-amount" },
            formatCurrency(totalSpent, profile),
          ),
        ),
      );
      return h(
        "div",
        { class: "s-page" },
        pageHeader({
          close,
          closeLabel: "Close budget breakdown details",
          eyebrow: "BUDGET BREAKDOWN",
          subtitle: period.isPartial
            ? `Prorated for ${period.daysCovered} of ${period.daysInMonth} days`
            : "Full-month budget period",
          title: formatMonthYear(year, month),
        }),
        h(
          "div",
          {
            "aria-label": "Budget breakdown details",
            class: "s-page-body s-scroll",
          },
          comparison,
          fixed,
          discretionaryCard,
        ),
      );
    },
  });
}
