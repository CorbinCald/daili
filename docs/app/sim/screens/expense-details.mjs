// The expense details route (app/expense/[id].tsx): a pushed page with the
// transaction, its share of the day's discretionary budget, and Edit.

import {
  buildExpenseSections,
  getDailyBudgetForDate,
  getMonthlyFixedCosts,
  parseDateKey,
  resolveMonthlyBudgetPlan,
} from "../budget.mjs";
import { formatCurrency, formatFullDate } from "../format.mjs";
import {
  compositeColor,
  ensureContrast,
  getExpenseCategoryMeta,
  readableCategoryColor,
} from "../themes.mjs";
import {
  button,
  categoryBadge,
  h,
  iconButton,
  primaryButton,
  sectionCard,
} from "../ui.mjs";
import { openEditExpenseSheet } from "../sheets/expense-form.mjs";

function detailRow(label, value, valueColor) {
  return h(
    "div",
    { class: "s-detail-line" },
    h("span", { class: "s-detail-line-label" }, label),
    h(
      "span",
      {
        class: "s-detail-line-value",
        style: valueColor ? { color: valueColor } : null,
      },
      value,
    ),
  );
}

/**
 * Keyboard-accessible grouping. The Today list groups expenses by long-press
 * drag, which a keyboard cannot perform, so the details page offers the same
 * moves as named buttons: group with another loose expense, join an existing
 * group, or leave the current one.
 */
function groupingCard({ ctx, current, dateKey }) {
  const date = ctx.parseDate(dateKey);
  const dayExpenses = ctx.state.expensesByDate[dateKey] ?? [];
  const sections = buildExpenseSections(dayExpenses);
  const ownGroup = sections.find(
    (section) =>
      section.type === "group" &&
      section.members.some((member) => member.id === current.id),
  );
  const drop = (target) =>
    ctx.store.actions.dropExpense(date, current.id, target);
  const options = [];
  if (ownGroup) {
    options.push(
      button(
        { class: "s-group-option", onClick: () => drop({ type: "none" }) },
        `Leave group ${ownGroup.label}`,
      ),
    );
  }
  for (const section of sections) {
    if (section.type === "group") {
      if (section.id === ownGroup?.id) continue;
      options.push(
        button(
          {
            class: "s-group-option",
            onClick: () => drop({ id: section.id, type: "group" }),
          },
          `Join group ${section.label}`,
        ),
      );
    } else if (section.expense.id !== current.id) {
      options.push(
        button(
          {
            class: "s-group-option",
            onClick: () => drop({ id: section.expense.id, type: "expense" }),
          },
          `Group with ${section.expense.label}`,
        ),
      );
    }
  }
  return sectionCard(
    { className: "s-details-card", title: "Grouping" },
    h(
      "p",
      { class: "s-card-text" },
      ownGroup
        ? `Part of ${ownGroup.label}. Grouped expenses show as one card on the Today screen.`
        : "Grouped expenses show as one card on the Today screen. On the phone you can also long-press and drag a row onto another.",
    ),
    options.length === 0
      ? h("p", { class: "s-empty-text" }, "No other expenses on this day.")
      : h("div", { class: "s-group-options" }, ...options),
  );
}

function findExpenseRecord(expensesByDate, id) {
  for (const [dateKey, expenses] of Object.entries(expensesByDate)) {
    const expense = expenses.find((item) => item.id === id);
    if (expense) return { dateKey, expense };
  }
  return null;
}

export function openExpenseDetails(ctx, { dateKey, expense }) {
  const profile = ctx.profile;
  const entry = ctx.host.push({
    render(close) {
      const page = h("div", { class: "s-page s-expense-details" });
      const render = () => {
        const record = findExpenseRecord(
          ctx.state.expensesByDate,
          expense.id,
        ) ?? { dateKey, expense };
        const current = record.expense;
        const category = getExpenseCategoryMeta(current.category);
        const budgetDate = parseDateKey(record.dateKey) ?? ctx.now();
        const resolvedPlan = resolveMonthlyBudgetPlan(
          ctx.state.monthlyBudgetPlans,
          budgetDate.getFullYear(),
          budgetDate.getMonth(),
        );
        const dailyBudget = getDailyBudgetForDate(
          resolvedPlan
            ? resolvedPlan.plan.totalSpendingCap -
                getMonthlyFixedCosts(resolvedPlan.plan)
            : 0,
          budgetDate,
        );
        const percent =
          dailyBudget > 0 ? (current.amount / dailyBudget) * 100 : null;
        const fill = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);
        page.replaceChildren(
          h(
            "div",
            { class: "s-page-header s-details-header" },
            h(
              "div",
              { class: "s-details-top-row" },
              iconButton({
                ariaLabel: "Go back",
                color: "rgba(255,255,255,0.78)",
                fontSize: 34,
                glyph: "‹",
                lineHeight: 36,
                onClick: () => close(),
                pressedBackground: "rgba(255,255,255,0.12)",
                size: 36,
              }),
              h("h2", { class: "s-details-title" }, "Expense details"),
              button(
                {
                  "aria-label": "Edit expense",
                  class: "s-details-edit",
                  onClick: () =>
                    openEditExpenseSheet(ctx, {
                      dateKey: record.dateKey,
                      expense: current,
                      onSaved: (savedDate) => {
                        ctx.setSelectedDate(savedDate);
                      },
                    }),
                },
                "Edit",
              ),
            ),
            h(
              "div",
              { class: "s-details-hero" },
              categoryBadge(category, { iconSize: 35, radius: 14, size: 44 }),
              h(
                "span",
                { class: "s-details-hero-text" },
                h(
                  "span",
                  { class: "s-details-expense-title" },
                  current.label || "Untitled expense",
                ),
                h(
                  "span",
                  {
                    class: "s-details-pill",
                    style: {
                      background: `${category.color}15`,
                      color: readableCategoryColor(
                        category,
                        compositeColor("#ffffff", 0.1, ctx.theme.primary),
                      ),
                    },
                  },
                  category.label,
                ),
              ),
              h(
                "span",
                { class: "s-details-amount" },
                formatCurrency(current.amount, profile),
              ),
            ),
          ),
          h(
            "div",
            { class: "s-page-body s-scroll s-details-body" },
            sectionCard(
              { className: "s-details-card", title: "Transaction" },
              h(
                "div",
                { class: "s-detail-stack" },
                detailRow(
                  "Date",
                  formatFullDate(parseDateKey(record.dateKey) ?? ctx.now()),
                ),
                detailRow("Time", current.time || "Time unavailable"),
                detailRow(
                  "Category",
                  category.label,
                  ensureContrast(category.color, ctx.theme.surface),
                ),
                detailRow("Type", "One-time expense"),
              ),
            ),
            sectionCard(
              { className: "s-details-card" },
              h(
                "div",
                { class: "s-impact-header" },
                h(
                  "div",
                  { class: "s-impact-text" },
                  h(
                    "h3",
                    { class: "s-section-card-title" },
                    "Daily discretionary impact",
                  ),
                  h(
                    "p",
                    { class: "s-card-text" },
                    dailyBudget > 0
                      ? "Based on the discretionary daily budget for this date."
                      : "A percentage isn’t available when the daily budget is zero or negative.",
                  ),
                ),
                h(
                  "span",
                  {
                    class: `s-impact-percent${percent !== null && percent > 100 ? " is-high" : ""}`,
                  },
                  percent === null ? "N/A" : `${Math.round(percent)}%`,
                ),
              ),
              h(
                "div",
                { class: "s-impact-track" },
                h("span", {
                  class: "s-impact-fill",
                  style: {
                    background:
                      percent !== null && percent > 100
                        ? "var(--danger)"
                        : category.color,
                    width: `${fill}%`,
                  },
                }),
              ),
              h(
                "div",
                { class: "s-impact-footer" },
                h("span", null, "Daily discretionary"),
                h("span", null, formatCurrency(dailyBudget, profile)),
              ),
            ),
            groupingCard({ ctx, current, dateKey: record.dateKey }),
            primaryButton({
              className: "s-details-done",
              label: "Back to expenses",
              onClick: () => close(),
              size: "large",
            }).el,
            h("p", { class: "s-details-id" }, `ID ${current.id}`),
          ),
        );
      };
      render();
      const unsubscribe = ctx.store.subscribe(() => {
        if (!findExpenseRecord(ctx.state.expensesByDate, expense.id)) {
          unsubscribe();
          close();
          return;
        }
        render();
      });
      // The overlay host dispatches this on its content wrapper when closing.
      queueMicrotask(() =>
        page.parentElement?.addEventListener(
          "sim-overlay-closed",
          unsubscribe,
          { once: true },
        ),
      );
      return page;
    },
  });
  return entry;
}
