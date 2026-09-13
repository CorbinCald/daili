// The Long-Term tab (components/daili/screens/LongTermScreen.tsx): month
// HUD, plan status strip, budget breakdown, pace chart, spending drivers and
// the recurring expenses card with its inline add form.

import {
  formatMonthKey,
  getActualOnlyMonthChartPoints,
  getBudgetPeriod,
  getCategorySpendingDrivers,
  getExpenseRecordsInRange,
  getExpenseTotal,
  getMonthlyBudgetPace,
  getMonthlyRecordsFromDay,
  getPeriodPlanAmounts,
  getRecurringTotal,
  getSpendingAnalyticsRanges,
  getTrailingWeekChartPoints,
  getYearPlanChartPoints,
  hasComparableSpendingHistory,
  parseDateKey,
  resolveMonthlyBudgetPlan,
} from "../budget.mjs";
import { paceChart } from "../chart.mjs";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthName,
  formatMonthYear,
  formatNumber,
  formatShortMonthDay,
  formatSignedWholeCurrency,
  formatWholeCurrency,
  isBudgetAmount,
  parseCurrencyInput,
  roundWholeAmount,
  sanitizeCurrencyInput,
} from "../format.mjs";
import { getExpenseCategoryMeta } from "../themes.mjs";
import {
  button,
  buttonGroup,
  categoryBadge,
  currencyInput,
  h,
  iconButton,
  inlineActionButton,
  primaryButton,
  sectionCard,
} from "../ui.mjs";
import { openBudgetBreakdown } from "../sheets/budget-breakdown.mjs";
import {
  openEditRecurringSheet,
  recurringExpenseForm,
} from "../sheets/recurring.mjs";
import { openSpendingDriver } from "../sheets/spending-driver.mjs";
import { bottomNavBar, hudGrid, screenHeader } from "./shared.mjs";

function planStatusStrip({
  headline,
  headlineAccessory,
  headlineTone = "default",
  metrics,
  children = [],
}) {
  return h(
    "div",
    { class: "s-plan-strip" },
    h(
      "div",
      { class: "s-plan-headline-row" },
      h(
        "p",
        {
          class: `s-plan-headline${headlineTone === "danger" ? " is-danger" : ""}`,
        },
        headline,
      ),
      headlineAccessory ?? null,
    ),
    h(
      "div",
      { class: "s-plan-metrics" },
      ...metrics.map((metric) =>
        h(
          "span",
          { class: `s-plan-chip${metric.tone ? ` is-${metric.tone}` : ""}` },
          metric.label,
        ),
      ),
    ),
    ...children,
  );
}

function budgetPaceStatusStrip({
  ctx,
  isProrated,
  projectedBudgetOverage,
  spendingBudget,
}) {
  const profile = ctx.profile;
  const normalizedOverage = Math.max(0, projectedBudgetOverage);
  const hasOverage = normalizedOverage > 0;
  const formattedBudget = formatWholeCurrency(
    roundWholeAmount(spendingBudget),
    profile,
  );
  const formattedOverage = formatCompactCurrency(normalizedOverage, profile);
  const metrics = [
    { key: "income", label: "Income —" },
    {
      key: "budget",
      label: `${isProrated ? "Prorated Budget" : "Budget"} ${formattedBudget}`,
    },
    ...(hasOverage
      ? [{ key: "overage", label: `Over ${formattedOverage}`, tone: "warning" }]
      : []),
  ];
  const uiState = ctx.ui.longTerm;
  // The draft lives in UI state so a re-render of the screen keeps it.
  let incomeText = uiState.incomeDraft ?? "";
  const children = [];
  let accessory = null;
  if (uiState.incomeFormOpen) {
    const incomeIsValid = () => {
      const parsed = parseCurrencyInput(incomeText, profile);
      return parsed >= 0 && isBudgetAmount(parsed, profile);
    };
    const save = primaryButton({
      disabled: !incomeIsValid(),
      label: "Save income",
      onClick: () => submit(),
      size: "small",
      className: "s-income-save",
    });
    const input = currencyInput({
      ariaLabel: "Monthly net income",
      autoFocus: true,
      backgroundClass: "is-on-surface",
      inactiveBorder: "var(--accent)",
      isActive: incomeText.length > 0,
      onChange: (value) => {
        incomeText = value;
        uiState.incomeDraft = value;
        save.setDisabled(!incomeIsValid());
        input.setActive(incomeText.length > 0);
      },
      onSubmit: () => submit(),
      placeholder: formatNumber(4000),
      profile,
      sanitize: sanitizeCurrencyInput,
      size: "small",
      value: incomeText,
    });
    const submit = () => {
      if (!incomeIsValid()) return;
      uiState.incomeFormOpen = false;
      uiState.incomeDraft = null;
      ctx.store.actions.updateMonthlyIncome(
        parseCurrencyInput(incomeText, profile),
      );
    };
    accessory = iconButton({
      ariaLabel: "Cancel",
      fontSize: 22,
      glyph: "×",
      onClick: () => {
        uiState.incomeFormOpen = false;
        uiState.incomeDraft = null;
        ctx.rerender();
      },
      size: 28,
    });
    children.push(
      h(
        "p",
        { class: "s-plan-prompt is-open" },
        "Add monthly net income to see projected savings.",
      ),
      h(
        "div",
        { class: "s-plan-form-row" },
        h("div", { class: "s-plan-input" }, input.el),
        save.el,
      ),
    );
  } else {
    children.push(
      h(
        "div",
        { class: "s-plan-prompt-row" },
        h(
          "p",
          { class: "s-plan-prompt" },
          "Add monthly net income to see projected savings.",
        ),
        inlineActionButton({
          ariaLabel: "Add income",
          label: "Add income",
          onClick: () => {
            uiState.incomeFormOpen = true;
            ctx.rerender();
          },
          trailingSymbol: "+",
        }).el,
      ),
    );
  }
  return planStatusStrip({
    children,
    headline: hasOverage
      ? `Projected ${formattedOverage} over budget`
      : "On track with your budget",
    headlineAccessory: accessory,
    headlineTone: hasOverage ? "danger" : "default",
    metrics,
  });
}

function savingsPlanStrip({
  ctx,
  income,
  isProrated,
  projectedBudgetOverage,
  spendingBudget,
}) {
  const profile = ctx.profile;
  const displayedIncome = roundWholeAmount(income);
  const displayedBudget = roundWholeAmount(spendingBudget);
  const normalizedOverage = Math.max(0, projectedBudgetOverage);
  const displayedOverage = roundWholeAmount(normalizedOverage);
  const hasOverage = normalizedOverage > 0;
  const formattedIncome = formatWholeCurrency(displayedIncome, profile);
  const formattedBudget = formatWholeCurrency(displayedBudget, profile);
  const formattedOverage = formatCompactCurrency(normalizedOverage, profile);
  const displayedSavings = displayedIncome - displayedBudget - displayedOverage;
  let headline;
  if (displayedSavings < 0)
    headline = `Spending exceeds income by ${formatWholeCurrency(Math.abs(displayedSavings), profile)}`;
  else if (displayedSavings === 0) headline = "No savings projected";
  else if (hasOverage)
    headline = `Still projected to save ${formatWholeCurrency(displayedSavings, profile)}`;
  else
    headline = `On track to save ${formatWholeCurrency(displayedSavings, profile)}`;
  return planStatusStrip({
    headline,
    headlineTone: displayedSavings < 0 ? "danger" : "default",
    metrics: [
      {
        key: "income",
        label: `${isProrated ? "Prorated Income" : "Income"} ${formattedIncome}`,
      },
      {
        key: "budget",
        label: `${isProrated ? "Prorated Budget" : "Budget"} ${formattedBudget}`,
      },
      ...(hasOverage
        ? [
            {
              key: "overage",
              label: `Over ${formattedOverage}`,
              tone: displayedSavings > 0 ? "warning" : "danger",
            },
          ]
        : []),
    ],
  });
}

function budgetBreakdownCard({
  ctx,
  monthLabel,
  onPress,
  periodBudget,
  periodRecurring,
  prorationNote,
  totalSpent,
}) {
  const profile = ctx.profile;
  const discretionary = periodBudget - periodRecurring;
  const remaining = discretionary - totalSpent;
  const recurringWidth =
    periodBudget > 0
      ? Math.min((periodRecurring / periodBudget) * 100, 100)
      : 0;
  const spendingWidth =
    periodBudget > 0
      ? Math.min(
          (totalSpent / periodBudget) * 100,
          Math.max(0, 100 - recurringWidth),
        )
      : 0;
  const whole = (value) => formatWholeCurrency(Math.round(value), profile);
  const info = prorationNote
    ? button(
        {
          "aria-label": "How this month's budget is prorated",
          class: "s-info-button",
          onClick: () => ctx.showInfo("Prorated first month", prorationNote),
        },
        "i",
      )
    : null;
  return sectionCard(
    { headerRight: info, title: "Budget breakdown" },
    button(
      {
        "aria-label": `View detailed budget breakdown for ${monthLabel}`,
        class: "s-breakdown-press",
        onClick: onPress,
      },
      h(
        "span",
        { class: "s-breakdown-track" },
        h("span", {
          class: "s-breakdown-segment is-recurring",
          style: { width: `${recurringWidth}%` },
        }),
        h("span", {
          class: "s-breakdown-segment is-spending",
          style: { width: `${spendingWidth}%` },
        }),
      ),
      h(
        "span",
        { class: "s-breakdown-rows" },
        h(
          "span",
          { class: "s-breakdown-row" },
          h(
            "span",
            { class: "s-breakdown-label-wrap" },
            h("span", { class: "s-legend-swatch is-recurring" }),
            h("span", { class: "s-breakdown-label" }, "Fixed / recurring"),
          ),
          h("span", { class: "s-breakdown-amount" }, whole(periodRecurring)),
        ),
        h(
          "span",
          { class: "s-breakdown-row" },
          h(
            "span",
            { class: "s-breakdown-label-wrap" },
            h("span", { class: "s-legend-swatch is-spending" }),
            h(
              "span",
              { class: "s-breakdown-label" },
              "Logged discretionary spending",
            ),
          ),
          h("span", { class: "s-breakdown-amount" }, whole(totalSpent)),
        ),
        h(
          "span",
          { class: "s-breakdown-row is-total" },
          h("span", { class: "s-breakdown-label" }, "Remaining discretionary"),
          h(
            "span",
            {
              class: `s-breakdown-amount ${remaining < 0 ? "is-negative" : "is-positive"}`,
            },
            `${remaining < 0 ? "-" : ""}${whole(Math.abs(remaining))}`,
          ),
        ),
      ),
      h(
        "span",
        { class: "s-details-link" },
        h("span", { class: "s-details-link-text" }, "View details"),
        h(
          "span",
          { "aria-hidden": "true", class: "s-details-link-arrow" },
          "›",
        ),
      ),
    ),
  );
}

function rangeLabel(start, end) {
  const startDate = parseDateKey(start);
  const endDate = parseDateKey(end);
  if (!startDate || !endDate) return `${start} – ${end}`;
  return `${formatShortMonthDay(startDate)} – ${formatShortMonthDay(endDate)}`;
}

function analyticsCards({
  ctx,
  expensesByDate,
  monthlyBudgetPlans,
  now,
  onboardingDateKey,
  pace,
  period,
  viewMonth,
  viewYear,
}) {
  const profile = ctx.profile;
  const uiState = ctx.ui.longTerm;
  const chartRange = uiState.chartRange;
  const isFutureMonth =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());
  let chartPoints;
  if (chartRange === "year") {
    chartPoints = getYearPlanChartPoints({
      expensesByDate,
      labelForMonth: (month) => formatMonthName(month, "narrow"),
      monthlyBudgetPlans,
      now,
      onboardingDateKey,
      year: viewYear,
    });
  } else if (pace && chartRange === "week") {
    chartPoints = getTrailingWeekChartPoints(pace.chartPoints);
  } else {
    const monthPoints =
      pace?.chartPoints ??
      getActualOnlyMonthChartPoints({
        expensesByDate,
        month: viewMonth,
        now,
        year: viewYear,
      });
    chartPoints =
      chartRange === "week"
        ? getTrailingWeekChartPoints(monthPoints)
        : monthPoints;
  }
  let copy;
  if (!pace || pace.delta === null) {
    copy =
      isFutureMonth && pace
        ? {
            detail:
              "This is the stored plan. Daili does not invent future spending.",
            headline: `${formatCurrency(pace.periodDiscretionaryAllowance, profile)} discretionary planned`,
            tone: "neutral",
          }
        : {
            detail:
              "Only actual spending is shown; Daili will not apply today’s plan to this period.",
            headline: "Plan comparison unavailable",
            tone: "neutral",
          };
  } else if (pace.status === "past") {
    const under = pace.delta >= 0;
    copy = {
      detail: "Settled result from logged expenses for this period.",
      headline: `${formatCurrency(Math.abs(pace.delta), profile)} ${under ? "under" : "over"} plan`,
      tone: under ? "positive" : "negative",
    };
  } else {
    const ahead = pace.delta >= 0;
    const remainingAmount =
      pace.periodDiscretionaryAllowance - pace.actualToDate;
    const detail =
      (pace.remainingAllowance ?? 0) < 0
        ? `The period budget is already exceeded by ${formatCurrency(Math.abs(remainingAmount), profile)}.`
        : `Average ${formatCurrency(pace.remainingAllowance ?? 0, profile)}/day for the remaining ${pace.remainingDays} days, including today, to ${ahead ? "finish on budget" : "recover"}.`;
    copy = {
      detail,
      headline: `${formatCurrency(Math.abs(pace.delta), profile)} ${ahead ? "ahead of" : "behind"} plan`,
      tone: ahead ? "positive" : "negative",
    };
  }
  const ranges = getSpendingAnalyticsRanges({
    month: viewMonth,
    now,
    periodStartDay: period.startDay,
    range: chartRange,
    year: viewYear,
  });
  const hasComparison =
    !ranges.isFuture &&
    hasComparableSpendingHistory(
      expensesByDate,
      onboardingDateKey,
      ranges.comparison,
    );
  const analysis = getCategorySpendingDrivers({
    currentRecords: ranges.isFuture
      ? []
      : getExpenseRecordsInRange(expensesByDate, ranges.current),
    hasComparableHistory: hasComparison,
    previousRecords: hasComparison
      ? getExpenseRecordsInRange(expensesByDate, ranges.comparison)
      : [],
  });
  const currentLabel = rangeLabel(ranges.current.start, ranges.current.end);
  const comparisonLabel = rangeLabel(
    ranges.comparison.start,
    ranges.comparison.end,
  );
  const chart = paceChart({
    detail: copy.detail,
    formatPointLabel: (point) =>
      chartRange === "year"
        ? formatMonthName(point.unit - 1, "long")
        : formatShortMonthDay(new Date(viewYear, viewMonth, point.unit)),
    headerAccessory: buttonGroup({
      ariaLabel: "Chart time range",
      onChange: (value) => {
        uiState.chartRange = value;
        ctx.rerender();
      },
      options: [
        { label: "Week", value: "week" },
        { label: "Month", value: "month" },
        { label: "Year", value: "year" },
      ],
      value: chartRange,
    }).el,
    headline: copy.headline,
    points: chartPoints,
    profile,
    theme: ctx.theme,
    title:
      chartRange === "year"
        ? "Monthly plan vs. actual"
        : "Cumulative spending pace",
    tone: copy.tone,
  });
  const driverDetail = (driver) => {
    if (!analysis.hasComparison) {
      return driver.shareOfCurrent === null
        ? formatCurrency(driver.currentAmount, profile)
        : `${formatCurrency(driver.currentAmount, profile)} · ${Math.round(driver.shareOfCurrent * 100)}% of spending`;
    }
    if (driver.trend === "new")
      return `${formatCurrency(driver.currentAmount, profile)} · New`;
    if (driver.trend === "flat")
      return `${formatCurrency(driver.currentAmount, profile)} · unchanged`;
    return `${formatCurrency(driver.currentAmount, profile)}, ${driver.trend === "up" ? "up" : "down"} ${formatCurrency(Math.abs(driver.change ?? 0), profile)}`;
  };
  const drivers = sectionCard(
    { title: "What changed?" },
    h(
      "p",
      { class: "s-drivers-intro" },
      analysis.hasComparison
        ? "Largest category changes for a like-for-like period."
        : "Not enough comparable history yet, so this is your current category breakdown.",
    ),
    analysis.drivers.length === 0
      ? h(
          "p",
          { class: "s-empty-text" },
          "No spending to explain for this period.",
        )
      : h(
          "div",
          { class: "s-driver-list" },
          ...analysis.drivers.map((driver) => {
            const category = getExpenseCategoryMeta(driver.category);
            return button(
              {
                "aria-label": `View ${category.label} transactions`,
                class: "s-driver-item",
                onClick: () =>
                  openSpendingDriver(ctx, {
                    comparisonLabel,
                    currentLabel,
                    driver,
                  }),
              },
              categoryBadge(category, { iconSize: 28, radius: 10, size: 38 }),
              h(
                "span",
                { class: "s-driver-copy" },
                h("span", { class: "s-driver-label" }, category.label),
                h("span", { class: "s-driver-detail" }, driverDetail(driver)),
              ),
              h(
                "span",
                { "aria-hidden": "true", class: "s-driver-arrow" },
                "›",
              ),
            );
          }),
        ),
  );
  return [chart, drivers];
}

function recurringExpensesCard({ ctx, recurringExpenses }) {
  const profile = ctx.profile;
  const uiState = ctx.ui.longTerm;
  const card = sectionCard({
    className: "s-recurring-card",
    title: "Monthly recurring",
    titleAccessory: h("span", { class: "s-recurring-symbol" }, "↻"),
  });
  if (uiState.addFormOpen) {
    card.append(
      h(
        "div",
        { class: "s-recurring-form-wrap" },
        recurringExpenseForm({
          initialDraft: uiState.recurringDraft,
          onCancel: () => {
            uiState.addFormOpen = false;
            uiState.recurringDraft = null;
            ctx.rerender();
          },
          onDraftChange: (draft) => {
            uiState.recurringDraft = draft;
          },
          onSave: (input) => {
            ctx.store.actions.addRecurringExpense(input);
            uiState.addFormOpen = false;
            uiState.recurringDraft = null;
            return true;
          },
          profile,
          submitLabel: "Add recurring expense",
        }),
      ),
    );
  }
  if (recurringExpenses.length === 0 && !uiState.addFormOpen) {
    card.append(
      h(
        "div",
        { class: "s-recurring-empty" },
        h("span", { class: "s-recurring-empty-symbol" }, "↻"),
        h(
          "p",
          { class: "s-recurring-empty-text" },
          "No recurring expenses yet",
        ),
        h(
          "p",
          { class: "s-recurring-empty-hint" },
          "Tap + to add your first one",
        ),
      ),
    );
    return card;
  }
  const list = h(
    "div",
    { class: "s-recurring-list" },
    ...recurringExpenses.map((expense) =>
      h(
        "div",
        { class: "s-recurring-row" },
        button(
          {
            "aria-label": `Edit ${expense.label}, ${formatCurrency(expense.amount, profile)}`,
            class: "s-recurring-press",
            onClick: () => openEditRecurringSheet(ctx, { expense }),
          },
          h("span", {
            class: "s-recurring-dot",
            style: { background: expense.color },
          }),
          h("span", { class: "s-recurring-label" }, expense.label),
          h(
            "span",
            { class: "s-recurring-amount" },
            formatCurrency(expense.amount, profile),
          ),
          h("span", { class: "s-recurring-edit" }, "Edit"),
        ),
        iconButton({
          ariaLabel: `Delete ${expense.label}`,
          className: "s-delete-button",
          fontSize: 22,
          glyph: "×",
          lineHeight: 23,
          onClick: () => ctx.store.actions.deleteRecurringExpense(expense.id),
          size: 44,
        }),
      ),
    ),
  );
  if (recurringExpenses.length > 0) {
    list.append(
      h(
        "div",
        { class: "s-recurring-total-row" },
        h("span", { class: "s-recurring-total-label" }, "Total monthly fixed"),
        h(
          "span",
          { class: "s-recurring-total-amount" },
          formatCurrency(getRecurringTotal(recurringExpenses), profile),
        ),
      ),
    );
  }
  card.append(list);
  return card;
}

export function renderLongTermScreen(ctx) {
  const state = ctx.state;
  const profile = ctx.profile;
  const now = ctx.now();
  const uiState = ctx.ui.longTerm;
  const currentMonthKey = formatMonthKey(now);
  const viewYear = uiState.selectedMonth?.year ?? now.getFullYear();
  const viewMonth = uiState.selectedMonth?.month ?? now.getMonth();
  const plans = state.monthlyBudgetPlans;
  const resolvedPlan = resolveMonthlyBudgetPlan(plans, viewYear, viewMonth);
  const period = getBudgetPeriod(
    viewYear,
    viewMonth,
    state.onboardingDateKey,
    state.expensesByDate,
  );
  const planAmounts = resolvedPlan
    ? getPeriodPlanAmounts(resolvedPlan.plan, period)
    : null;
  const pace = resolvedPlan
    ? getMonthlyBudgetPace({
        expensesByDate: state.expensesByDate,
        month: viewMonth,
        now,
        period,
        plan: resolvedPlan.plan,
        year: viewYear,
      })
    : null;
  const records = getMonthlyRecordsFromDay(
    state.expensesByDate,
    viewYear,
    viewMonth,
    period.startDay,
  );
  const totalSpent = getExpenseTotal(records.map(({ expense }) => expense));
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isFutureMonth =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());
  const budgetLeft = planAmounts
    ? planAmounts.periodDiscretionaryAllowance - totalSpent
    : null;
  const monthLabel = formatMonthYear(viewYear, viewMonth);

  let hud;
  if (!resolvedPlan || !planAmounts) {
    hud = {
      label: "PLAN UNAVAILABLE",
      subtext: "Actual spending only",
      value: "—",
    };
  } else if (isFutureMonth) {
    hud = {
      label: "PLANNED LEFT",
      subtext: "planned amount · no forecast",
      value: formatWholeCurrency(
        planAmounts.periodDiscretionaryAllowance,
        profile,
      ),
    };
  } else {
    const isOver = budgetLeft !== null && budgetLeft < 0;
    hud = {
      label: isCurrentMonth
        ? "BUDGET LEFT"
        : isOver
          ? "OVER BUDGET"
          : "UNDER BUDGET",
      subtext: isCurrentMonth
        ? "based on expenses logged so far"
        : "settled plan versus logged spending",
      tone: isOver ? "negative" : "positive",
      value: formatSignedWholeCurrency(budgetLeft ?? 0, profile),
    };
  }
  const header = screenHeader(
    "Long-Term",
    hudGrid([
      {
        label: "SPENT",
        subtext: planAmounts
          ? `of ${formatWholeCurrency(planAmounts.periodDiscretionaryAllowance, profile)} discretionary${period.isPartial ? ` (${period.daysCovered}d)` : ""}`
          : "Actual spending only",
        value: formatWholeCurrency(totalSpent, profile),
      },
      hud,
    ]),
  );

  const content = h("div", {
    class: "s-scroll s-long-term-content",
    dataset: { scrollKey: "long-term" },
  });
  if (isCurrentMonth && planAmounts && budgetLeft !== null) {
    content.append(
      planAmounts.periodIncome === null
        ? budgetPaceStatusStrip({
            ctx,
            isProrated: period.isPartial,
            projectedBudgetOverage: pace?.projectedBudgetOverage ?? 0,
            spendingBudget: planAmounts.periodSpendingCap,
          })
        : savingsPlanStrip({
            ctx,
            income: planAmounts.periodIncome,
            isProrated: period.isPartial,
            projectedBudgetOverage: pace?.projectedBudgetOverage ?? 0,
            spendingBudget: planAmounts.periodSpendingCap,
          }),
    );
  }
  if (planAmounts) {
    content.append(
      budgetBreakdownCard({
        ctx,
        monthLabel,
        onPress: () =>
          openBudgetBreakdown(ctx, {
            expenseRecords: records,
            month: viewMonth,
            period,
            periodBudget: planAmounts.periodSpendingCap,
            periodRecurring: planAmounts.periodFixedCosts,
            recurringExpenses: resolvedPlan.plan.fixedExpenses,
            totalSpent,
            year: viewYear,
          }),
        periodBudget: planAmounts.periodSpendingCap,
        periodRecurring: planAmounts.periodFixedCosts,
        prorationNote: period.isPartial
          ? `This is your first month, so the budget covers only ${period.daysCovered} of ${period.daysInMonth} days (from day ${period.startDay}). Your monthly budget and fixed costs are prorated to that window.`
          : undefined,
        totalSpent,
      }),
    );
  } else {
    content.append(
      sectionCard(
        { title: "Historical plan unavailable" },
        h(
          "p",
          { class: "s-plan-unavailable-text" },
          "Daili did not store the plan that applied this month. Current settings are not used to rewrite history.",
        ),
        h(
          "p",
          { class: "s-actual-only-amount" },
          `Logged spending: ${formatCurrency(totalSpent, profile)}`,
        ),
      ),
    );
  }
  content.append(
    ...analyticsCards({
      ctx,
      expensesByDate: state.expensesByDate,
      monthlyBudgetPlans: plans,
      now,
      onboardingDateKey: state.onboardingDateKey,
      pace,
      period,
      viewMonth,
      viewYear,
    }),
  );
  content.append(
    recurringExpensesCard({ ctx, recurringExpenses: state.recurringExpenses }),
  );

  const changeMonth = (offset) => {
    const date = new Date(viewYear, viewMonth + offset, 1);
    uiState.selectedMonth =
      formatMonthKey(date) === currentMonthKey
        ? null
        : { month: date.getMonth(), year: date.getFullYear() };
    ctx.rerender();
  };
  const nav = bottomNavBar({
    addLabel: "Add recurring expense",
    nextLabel: "Next month",
    onAdd: () => {
      uiState.addFormOpen = !uiState.addFormOpen;
      if (!uiState.addFormOpen) uiState.recurringDraft = null;
      ctx.rerender();
      // The form sits above the list, so scroll to it rather than to the end.
      if (uiState.addFormOpen)
        ctx.scrollIntoView("long-term", ".s-recurring-form-wrap");
    },
    onNext: () => changeMonth(1),
    onPrevious: () => changeMonth(-1),
    onTitle: () => {
      uiState.selectedMonth = null;
      ctx.rerender();
    },
    previousLabel: "Previous month",
    title: monthLabel,
    titleLabel: "Jump to current month",
  });
  return h(
    "div",
    { class: "s-screen s-long-term-screen" },
    header,
    content,
    nav,
  );
}
