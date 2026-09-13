// The purchases behind one spending driver (components/daili/budget/SpendingDriverDetails.tsx).

import { parseDateKey } from "../budget.mjs";
import { formatCurrency, formatShortMonthDay } from "../format.mjs";
import { getExpenseCategoryMeta } from "../themes.mjs";
import { h } from "../ui.mjs";
import { pageHeader } from "./daily-breakdown.mjs";

function periodSection({ amount, profile, title, transactions }) {
  return h(
    "section",
    { class: "s-driver-period" },
    h("h3", { class: "s-driver-period-title" }, title),
    h("p", { class: "s-driver-period-total" }, formatCurrency(amount, profile)),
    transactions.length === 0
      ? h("p", { class: "s-empty-text" }, "No transactions in this period.")
      : h(
          "div",
          { class: "s-driver-rows" },
          ...transactions.map((transaction) => {
            const date = parseDateKey(transaction.dateKey);
            return h(
              "div",
              { class: "s-driver-row" },
              h(
                "span",
                { class: "s-driver-row-copy" },
                h("span", { class: "s-driver-row-label" }, transaction.label),
                h(
                  "span",
                  { class: "s-driver-row-meta" },
                  date ? formatShortMonthDay(date) : transaction.dateKey,
                ),
              ),
              h(
                "span",
                { class: "s-driver-row-amount" },
                formatCurrency(transaction.amount, profile),
              ),
            );
          }),
        ),
  );
}

export function openSpendingDriver(
  ctx,
  { comparisonLabel, currentLabel, driver },
) {
  const profile = ctx.profile;
  const category = getExpenseCategoryMeta(driver.category);
  ctx.host.sheet({
    render(close) {
      const sections = [
        periodSection({
          amount: driver.currentAmount,
          profile,
          title: currentLabel,
          transactions: driver.currentTransactions,
        }),
      ];
      if (driver.trend !== "breakdown") {
        sections.push(
          periodSection({
            amount: driver.previousAmount,
            profile,
            title: comparisonLabel,
            transactions: driver.previousTransactions,
          }),
        );
      }
      return h(
        "div",
        { class: "s-page" },
        pageHeader({
          close,
          closeLabel: "Close spending driver details",
          eyebrow: "SPENDING DRIVER",
          title: category.label,
        }),
        h(
          "div",
          {
            "aria-label": "Spending driver details",
            class: "s-page-body s-scroll",
          },
          ...sections,
        ),
      );
    },
  });
}
