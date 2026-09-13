// Pure budget mathematics for the simulated phone, mirroring the Android
// app's utils/date.ts, utils/budget.ts, utils/budgetPlans.ts,
// utils/budgetAnalytics.ts, utils/spendingAnalytics.ts, utils/expenseGroups.ts
// and utils/guidedBudget.ts. Everything here is deterministic and free of DOM.

// ---- dates ----------------------------------------------------------------

export function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7)) - 1;
  const day = Number(dateKey.slice(8, 10));
  const date = new Date(year, month, day);
  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : null;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getPreviousDate(date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return previous;
}

export function getNextDate(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function isSameCalendarDate(first, second) {
  return first.toDateString() === second.toDateString();
}

function getDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

// ---- plans ----------------------------------------------------------------

export function formatMonthKey(yearOrDate, month) {
  const year =
    yearOrDate instanceof Date ? yearOrDate.getFullYear() : yearOrDate;
  const monthIndex = yearOrDate instanceof Date ? yearOrDate.getMonth() : month;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function createMonthlyBudgetPlan({
  fixedExpenses,
  income,
  savingsTarget,
  source,
  totalSpendingCap,
}) {
  return {
    fixedExpenses: fixedExpenses.map((expense) => ({ ...expense })),
    ...(income !== undefined && Number.isFinite(income) && income >= 0
      ? { income }
      : {}),
    ...(savingsTarget !== undefined &&
    Number.isFinite(savingsTarget) &&
    savingsTarget >= 0
      ? { savingsTarget }
      : {}),
    source,
    totalSpendingCap,
  };
}

export function setMonthlyBudgetPlan(plans, monthKey, plan) {
  return { ...plans, [monthKey]: createMonthlyBudgetPlan(plan) };
}

export function resolveMonthlyBudgetPlan(plans, year, month) {
  const targetMonth = formatMonthKey(year, month);
  const effectiveMonth = Object.keys(plans)
    .filter((key) => key <= targetMonth)
    .sort()
    .at(-1);
  if (!effectiveMonth) return null;
  return {
    effectiveMonth,
    plan: plans[effectiveMonth],
    resolution: effectiveMonth === targetMonth ? "exact" : "carried-forward",
  };
}

export function getMonthlyFixedCosts(plan) {
  return plan.fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function prorateMonthlyAmount(amount, period) {
  return period.daysInMonth <= 0
    ? 0
    : (amount * period.daysCovered) / period.daysInMonth;
}

export const getProratedAmount = prorateMonthlyAmount;

export function getPeriodPlanAmounts(plan, period) {
  const monthlyFixedCosts = getMonthlyFixedCosts(plan);
  const monthlyDiscretionaryAllowance =
    plan.totalSpendingCap - monthlyFixedCosts;
  return {
    monthlyDiscretionaryAllowance,
    monthlyFixedCosts,
    periodDiscretionaryAllowance: prorateMonthlyAmount(
      monthlyDiscretionaryAllowance,
      period,
    ),
    periodFixedCosts: prorateMonthlyAmount(monthlyFixedCosts, period),
    periodIncome:
      plan.income === undefined
        ? null
        : prorateMonthlyAmount(plan.income, period),
    periodSavingsTarget:
      plan.savingsTarget === undefined
        ? null
        : prorateMonthlyAmount(plan.savingsTarget, period),
    periodSpendingCap: prorateMonthlyAmount(plan.totalSpendingCap, period),
  };
}

// ---- budget periods and daily summary ---------------------------------------

export function getOnboardingDayInMonth(onboardingDateKey, year, month) {
  if (!onboardingDateKey) return null;
  const onboardingYear = Number(onboardingDateKey.slice(0, 4));
  const onboardingMonth = Number(onboardingDateKey.slice(5, 7)) - 1;
  const onboardingDay = Number(onboardingDateKey.slice(8, 10));
  return onboardingYear === year &&
    onboardingMonth === month &&
    Number.isFinite(onboardingDay)
    ? onboardingDay
    : null;
}

function getEarliestExpenseDayBeforeOnboarding(
  expensesByDate,
  year,
  month,
  onboardingDay,
) {
  for (let day = 1; day < onboardingDay; day += 1) {
    if ((expensesByDate[getDateKey(year, month, day)]?.length ?? 0) > 0)
      return day;
  }
  return null;
}

export function getBudgetPeriod(
  year,
  month,
  onboardingDateKey,
  expensesByDate,
) {
  const daysInMonth = getDaysInMonth(year, month);
  const onboardingDay = getOnboardingDayInMonth(onboardingDateKey, year, month);
  const earliestExpenseDay = onboardingDay
    ? getEarliestExpenseDayBeforeOnboarding(
        expensesByDate,
        year,
        month,
        onboardingDay,
      )
    : null;
  const startDay =
    onboardingDay && onboardingDay > 1
      ? Math.min(
          onboardingDay,
          earliestExpenseDay ?? onboardingDay,
          daysInMonth,
        )
      : 1;
  const daysCovered = daysInMonth - startDay + 1;
  return { daysCovered, daysInMonth, isPartial: startDay > 1, startDay };
}

export function getDailyBudget(monthlyBudget, daysInBudgetPeriod = 30) {
  return monthlyBudget / daysInBudgetPeriod;
}

export function getDailyBudgetForDate(monthlyBudget, date) {
  return getDailyBudget(
    monthlyBudget,
    getDaysInMonth(date.getFullYear(), date.getMonth()),
  );
}

export function getRecurringTotal(recurringExpenses) {
  return recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function getExpenseTotal(expenses) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function getExpensesForDateKey(expensesByDate, dateKey) {
  return expensesByDate[dateKey] ?? [];
}

export function getDailyTotalsByDate(expensesByDate) {
  const totals = {};
  for (const [dateKey, expenses] of Object.entries(expensesByDate)) {
    totals[dateKey] = getExpenseTotal(expenses);
  }
  return totals;
}

export function getMonthlyExpenseRecords(expensesByDate, year, month) {
  const records = [];
  for (let day = 1; day <= getDaysInMonth(year, month); day += 1) {
    const dateKey = getDateKey(year, month, day);
    for (const expense of getExpensesForDateKey(expensesByDate, dateKey)) {
      records.push({ dateKey, expense });
    }
  }
  return records;
}

export function getMonthlyRecordsFromDay(
  expensesByDate,
  year,
  month,
  startDay,
) {
  return getMonthlyExpenseRecords(expensesByDate, year, month).filter(
    ({ dateKey }) => Number(dateKey.slice(8, 10)) >= startDay,
  );
}

function getFirstSpentDateKeyInMonth(expensesByDate, date) {
  const selectedDateKey = formatDateKey(date);
  const monthPrefix = selectedDateKey.slice(0, 8);
  let first = null;
  for (const [dateKey, expenses] of Object.entries(expensesByDate)) {
    if (
      !dateKey.startsWith(monthPrefix) ||
      dateKey > selectedDateKey ||
      expenses.length === 0
    )
      continue;
    if (!first || dateKey < first) first = dateKey;
  }
  return first;
}

function getBudgetPeriodStartDate(expensesByDate, date, onboardingDateKey) {
  const selectedDateKey = formatDateKey(date);
  const firstSpentDateKey = getFirstSpentDateKeyInMonth(expensesByDate, date);
  let startDateKey = null;
  if (onboardingDateKey && onboardingDateKey <= selectedDateKey) {
    startDateKey =
      onboardingDateKey.slice(0, 7) === selectedDateKey.slice(0, 7)
        ? onboardingDateKey
        : `${selectedDateKey.slice(0, 7)}-01`;
  }
  if (firstSpentDateKey) {
    startDateKey =
      startDateKey && startDateKey < firstSpentDateKey
        ? startDateKey
        : firstSpentDateKey;
  }
  return startDateKey ? parseDateKey(startDateKey) : null;
}

export function getRolloverForDate(
  expensesByDate,
  date,
  discretionaryMonthlyBudget,
  onboardingDateKey,
) {
  const selectedDateKey = formatDateKey(date);
  const periodStart = getBudgetPeriodStartDate(
    expensesByDate,
    date,
    onboardingDateKey,
  );
  if (!periodStart || selectedDateKey === formatDateKey(periodStart)) return 0;
  let rollover = 0;
  for (
    let current = periodStart;
    formatDateKey(current) < selectedDateKey;
    current = getNextDate(current)
  ) {
    rollover +=
      getDailyBudgetForDate(discretionaryMonthlyBudget, current) -
      getExpenseTotal(
        getExpensesForDateKey(expensesByDate, formatDateKey(current)),
      );
  }
  return rollover;
}

function getEarliestDataDateKey(expensesByDate, onboardingDateKey) {
  let earliest = onboardingDateKey;
  for (const [dateKey, expenses] of Object.entries(expensesByDate)) {
    if (expenses.length > 0 && (!earliest || dateKey < earliest))
      earliest = dateKey;
  }
  return earliest;
}

export function getDailyBudgetSummary({
  expensesByDate,
  monthlyBudgetPlans,
  onboardingDateKey,
  selectedDate,
}) {
  const dateKey = formatDateKey(selectedDate);
  const expenses = getExpensesForDateKey(expensesByDate, dateKey);
  const resolvedPlan = resolveMonthlyBudgetPlan(
    monthlyBudgetPlans,
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
  );
  const totalRecurring = resolvedPlan
    ? getMonthlyFixedCosts(resolvedPlan.plan)
    : 0;
  const discretionaryMonthlyBudget = resolvedPlan
    ? resolvedPlan.plan.totalSpendingCap - totalRecurring
    : 0;
  const dailyBudget = getDailyBudgetForDate(
    discretionaryMonthlyBudget,
    selectedDate,
  );
  const rollover = resolvedPlan
    ? getRolloverForDate(
        expensesByDate,
        selectedDate,
        discretionaryMonthlyBudget,
        onboardingDateKey,
      )
    : 0;
  const totalSpent = getExpenseTotal(expenses);
  const effectiveBudget = dailyBudget + rollover;
  const earliest = getEarliestDataDateKey(expensesByDate, onboardingDateKey);
  return {
    dailyBudget,
    dateKey,
    discretionaryMonthlyBudget,
    effectiveBudget,
    expenses,
    hasData: earliest !== null && dateKey >= earliest,
    hasPlan: resolvedPlan !== null,
    remaining: effectiveBudget - totalSpent,
    rollover,
    totalRecurring,
    totalSpent,
  };
}

// ---- pace analytics ---------------------------------------------------------

function getMonthStatus(year, month, now) {
  const selected = year * 12 + month;
  const current = now.getFullYear() * 12 + now.getMonth();
  return selected < current
    ? "past"
    : selected > current
      ? "future"
      : "current";
}

const PACE_NOISE_EPSILON = 1e-9;
const WEEK_LENGTH = 7;

export function getMonthlyBudgetPace({
  expensesByDate,
  now,
  period,
  plan,
  year,
  month,
}) {
  const status = getMonthStatus(year, month, now);
  const { periodDiscretionaryAllowance } = getPeriodPlanAmounts(plan, period);
  const dailyPlanned =
    period.daysCovered > 0
      ? periodDiscretionaryAllowance / period.daysCovered
      : 0;
  const totalsByDate = getDailyTotalsByDate(expensesByDate);
  const currentDay =
    status === "current"
      ? clamp(now.getDate(), period.startDay, period.daysInMonth)
      : status === "past"
        ? period.daysInMonth
        : period.startDay - 1;
  let actualCumulative = 0;
  const chartPoints = Array.from({ length: period.daysCovered }, (_, index) => {
    const day = period.startDay + index;
    const hasHappened =
      status === "past" || (status === "current" && day <= currentDay);
    if (hasHappened)
      actualCumulative += totalsByDate[getDateKey(year, month, day)] ?? 0;
    return {
      actual: hasHappened ? actualCumulative : null,
      isCurrent: status === "current" && day === currentDay,
      label: String(day),
      planned: dailyPlanned * (index + 1),
      unit: day,
    };
  });
  const elapsedDays =
    status === "future" ? 0 : Math.max(0, currentDay - period.startDay + 1);
  const actualToDate =
    elapsedDays === 0 ? 0 : (chartPoints[elapsedDays - 1]?.actual ?? 0);
  const plannedToDate = status === "future" ? null : dailyPlanned * elapsedDays;
  const rawDelta = plannedToDate === null ? null : plannedToDate - actualToDate;
  const delta =
    rawDelta !== null && Math.abs(rawDelta) < PACE_NOISE_EPSILON ? 0 : rawDelta;
  const remainingDays =
    status === "current" ? Math.max(1, period.daysInMonth - currentDay + 1) : 0;
  return {
    actualToDate,
    chartPoints,
    delta,
    periodDiscretionaryAllowance,
    plannedToDate,
    projectedBudgetOverage: delta === null ? null : Math.max(0, -delta),
    remainingAllowance:
      status === "current"
        ? (periodDiscretionaryAllowance - actualToDate) / remainingDays
        : null,
    remainingDays,
    status,
  };
}

export function getActualOnlyMonthChartPoints({
  expensesByDate,
  month,
  now,
  year,
}) {
  const status = getMonthStatus(year, month, now);
  const daysInMonth = getDaysInMonth(year, month);
  const lastActualDay =
    status === "past" ? daysInMonth : status === "current" ? now.getDate() : 0;
  const totalsByDate = getDailyTotalsByDate(expensesByDate);
  let actualCumulative = 0;
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const hasHappened = day <= lastActualDay;
    if (hasHappened)
      actualCumulative += totalsByDate[getDateKey(year, month, day)] ?? 0;
    return {
      actual: hasHappened ? actualCumulative : null,
      isCurrent: status === "current" && day === lastActualDay,
      label: String(day),
      planned: null,
      unit: day,
    };
  });
}

export function getLastActualIndex(points) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].actual !== null) return index;
  }
  return -1;
}

export function getTrailingWeekChartPoints(points) {
  const lastActualIndex = getLastActualIndex(points);
  const extendsAhead =
    lastActualIndex === -1 || points.some((point) => point.planned !== null);
  const end = extendsAhead
    ? clamp(WEEK_LENGTH, lastActualIndex + 1, points.length)
    : lastActualIndex + 1;
  return points.slice(Math.max(0, end - WEEK_LENGTH), end);
}

export function getYearPlanChartPoints({
  expensesByDate,
  monthlyBudgetPlans,
  now,
  onboardingDateKey,
  year,
  labelForMonth,
}) {
  const totalsByDate = getDailyTotalsByDate(expensesByDate);
  const yearStatus =
    year < now.getFullYear()
      ? "past"
      : year > now.getFullYear()
        ? "future"
        : "current";
  return Array.from({ length: 12 }, (_, month) => {
    const resolvedPlan = resolveMonthlyBudgetPlan(
      monthlyBudgetPlans,
      year,
      month,
    );
    const period = getBudgetPeriod(
      year,
      month,
      onboardingDateKey,
      expensesByDate,
    );
    const planned = resolvedPlan
      ? getPeriodPlanAmounts(resolvedPlan.plan, period)
          .periodDiscretionaryAllowance
      : null;
    const monthHasHappened =
      yearStatus === "past" ||
      (yearStatus === "current" && month <= now.getMonth());
    const daysToCount =
      yearStatus === "current" && month === now.getMonth()
        ? now.getDate()
        : getDaysInMonth(year, month);
    let actual = 0;
    for (let day = period.startDay; day <= daysToCount; day += 1) {
      actual += totalsByDate[getDateKey(year, month, day)] ?? 0;
    }
    return {
      actual: monthHasHappened ? actual : null,
      isCurrent: yearStatus === "current" && month === now.getMonth(),
      label: labelForMonth(month),
      planned,
      unit: month + 1,
    };
  });
}

// ---- spending drivers -------------------------------------------------------

function dateFromParts(year, month, day) {
  return new Date(year, month, day, 12);
}

export function getSpendingAnalyticsRanges({
  month,
  now,
  periodStartDay = 1,
  range,
  year,
}) {
  const monthStatus = getMonthStatus(year, month, now);
  if (range === "week") {
    const endDay =
      monthStatus === "current" ? now.getDate() : getDaysInMonth(year, month);
    const currentEnd = dateFromParts(year, month, endDay);
    const currentStart = addDays(currentEnd, -6);
    const comparisonEnd = addDays(currentStart, -1);
    return {
      comparison: {
        end: formatDateKey(comparisonEnd),
        start: formatDateKey(addDays(comparisonEnd, -6)),
      },
      current: {
        end: formatDateKey(currentEnd),
        start: formatDateKey(currentStart),
      },
      isFuture: monthStatus === "future",
    };
  }
  if (range === "year") {
    const isCurrentYear = year === now.getFullYear();
    const currentEnd = isCurrentYear
      ? dateFromParts(year, now.getMonth(), now.getDate())
      : dateFromParts(year, 11, 31);
    const previousEnd = isCurrentYear
      ? dateFromParts(
          year - 1,
          now.getMonth(),
          Math.min(now.getDate(), getDaysInMonth(year - 1, now.getMonth())),
        )
      : dateFromParts(year - 1, 11, 31);
    return {
      comparison: {
        end: formatDateKey(previousEnd),
        start: `${year - 1}-01-01`,
      },
      current: { end: formatDateKey(currentEnd), start: `${year}-01-01` },
      isFuture: year > now.getFullYear(),
    };
  }
  const currentEndDay =
    monthStatus === "current" ? now.getDate() : getDaysInMonth(year, month);
  const currentStart = dateFromParts(year, month, periodStartDay);
  const currentEnd = dateFromParts(year, month, currentEndDay);
  const previousMonth = dateFromParts(year, month - 1, 1);
  const previousMonthDays = getDaysInMonth(
    previousMonth.getFullYear(),
    previousMonth.getMonth(),
  );
  const elapsedDayCount = Math.max(1, currentEndDay - periodStartDay + 1);
  const comparisonStartDay = Math.min(periodStartDay, previousMonthDays);
  const comparisonEndDay =
    monthStatus === "current"
      ? Math.min(previousMonthDays, comparisonStartDay + elapsedDayCount - 1)
      : previousMonthDays;
  return {
    comparison: {
      end: formatDateKey(
        dateFromParts(
          previousMonth.getFullYear(),
          previousMonth.getMonth(),
          comparisonEndDay,
        ),
      ),
      start: formatDateKey(
        dateFromParts(
          previousMonth.getFullYear(),
          previousMonth.getMonth(),
          monthStatus === "current" ? comparisonStartDay : 1,
        ),
      ),
    },
    current: {
      end: formatDateKey(currentEnd),
      start: formatDateKey(currentStart),
    },
    isFuture: monthStatus === "future",
  };
}

export function getExpenseRecordsInRange(expensesByDate, range) {
  return Object.entries(expensesByDate)
    .filter(([dateKey]) => dateKey >= range.start && dateKey <= range.end)
    .sort(([first], [second]) => first.localeCompare(second))
    .flatMap(([dateKey, expenses]) =>
      expenses.map((expense) => ({ dateKey, expense })),
    );
}

export function getAccountingTransactions(records) {
  return records.map(({ dateKey, expense }) => ({
    amount: expense.amount,
    category: expense.category || "other",
    dateKey,
    id: `expense:${dateKey}:${expense.id}`,
    label: expense.label,
    records: [{ dateKey, expense }],
  }));
}

function groupByCategory(transactions) {
  const grouped = new Map();
  for (const transaction of transactions) {
    const category = transaction.category || "other";
    grouped.set(category, [...(grouped.get(category) ?? []), transaction]);
  }
  return grouped;
}

function totalTransactions(transactions) {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getCategorySpendingDrivers({
  currentRecords,
  hasComparableHistory,
  limit = 3,
  previousRecords,
}) {
  const currentTransactions = getAccountingTransactions(currentRecords);
  const previousTransactions = getAccountingTransactions(previousRecords);
  const currentByCategory = groupByCategory(currentTransactions);
  const previousByCategory = groupByCategory(previousTransactions);
  const currentTotal = totalTransactions(currentTransactions);
  const previousTotal = totalTransactions(previousTransactions);
  const categories = new Set([
    ...currentByCategory.keys(),
    ...(hasComparableHistory ? previousByCategory.keys() : []),
  ]);
  const drivers = [...categories].map((category) => {
    const categoryCurrent = currentByCategory.get(category) ?? [];
    const categoryPrevious = previousByCategory.get(category) ?? [];
    const currentAmount = totalTransactions(categoryCurrent);
    const previousAmount = totalTransactions(categoryPrevious);
    const shareOfCurrent =
      currentTotal > 0 && currentAmount >= 0
        ? currentAmount / currentTotal
        : null;
    if (!hasComparableHistory) {
      return {
        category,
        change: null,
        currentAmount,
        currentTransactions: categoryCurrent,
        percentChange: null,
        previousAmount: 0,
        previousTransactions: [],
        shareOfCurrent,
        trend: "breakdown",
      };
    }
    const change = currentAmount - previousAmount;
    return {
      category,
      change,
      currentAmount,
      currentTransactions: categoryCurrent,
      percentChange: previousAmount > 0 ? change / previousAmount : null,
      previousAmount,
      previousTransactions: categoryPrevious,
      shareOfCurrent,
      trend:
        previousAmount === 0 && currentAmount > 0
          ? "new"
          : change > 0
            ? "up"
            : change < 0
              ? "down"
              : "flat",
    };
  });
  drivers.sort((first, second) => {
    if (hasComparableHistory) {
      const impact = Math.abs(second.change ?? 0) - Math.abs(first.change ?? 0);
      if (impact !== 0) return impact;
    }
    return second.currentAmount - first.currentAmount;
  });
  return {
    currentTotal,
    drivers: drivers.slice(0, limit),
    hasComparison: hasComparableHistory,
    previousTotal,
  };
}

export function hasComparableSpendingHistory(
  expensesByDate,
  onboardingDateKey,
  comparisonRange,
) {
  const earliestExpense = Object.keys(expensesByDate)
    .filter((key) => (expensesByDate[key]?.length ?? 0) > 0)
    .sort()[0];
  const earliestKnown = [earliestExpense, onboardingDateKey]
    .filter(Boolean)
    .sort()[0];
  return earliestKnown !== undefined && earliestKnown <= comparisonRange.start;
}

// ---- expense groups ----------------------------------------------------------

function countGroupMembers(expenses) {
  const counts = new Map();
  for (const expense of expenses) {
    if (expense.groupId)
      counts.set(expense.groupId, (counts.get(expense.groupId) ?? 0) + 1);
  }
  return counts;
}

function withoutGroup(expense) {
  const { groupId: _omitted, ...rest } = expense;
  return rest;
}

function dissolveUndersizedGroups(expenses) {
  const counts = countGroupMembers(expenses);
  return expenses.map((expense) =>
    expense.groupId && (counts.get(expense.groupId) ?? 0) < 2
      ? withoutGroup(expense)
      : expense,
  );
}

/**
 * The name a group's members carry, if any. Names travel with members, so a
 * former member of a named group may bring the name into a new group in any
 * position; every reader must search the whole membership.
 */
export function findExpenseGroupLabel(members) {
  for (const member of members) {
    const merchant = member.groupLabel?.trim();
    if (merchant) return merchant;
  }
  return undefined;
}

export function getExpenseGroupLabel(members) {
  return findExpenseGroupLabel(members) ?? "Group";
}

export function buildExpenseSections(expenses) {
  const counts = countGroupMembers(expenses);
  const sections = [];
  const emitted = new Set();
  for (const expense of expenses) {
    const groupId = expense.groupId;
    if (!groupId || (counts.get(groupId) ?? 0) < 2) {
      sections.push({ expense, type: "expense" });
      continue;
    }
    if (emitted.has(groupId)) continue;
    emitted.add(groupId);
    const members = expenses.filter((item) => item.groupId === groupId);
    sections.push({
      category: members[0].category,
      id: groupId,
      label: getExpenseGroupLabel(members),
      members,
      total: getExpenseTotal(members),
      type: "group",
    });
  }
  return sections;
}

export function applyExpenseDrop(expenses, sourceId, target, createGroupId) {
  const source = expenses.find((expense) => expense.id === sourceId);
  if (!source) return null;
  if (target.type === "none") {
    if (!source.groupId) return null;
    return dissolveUndersizedGroups(
      expenses.map((expense) =>
        expense.id === sourceId ? withoutGroup(expense) : expense,
      ),
    );
  }
  let groupId;
  if (target.type === "group") {
    if (!expenses.some((expense) => expense.groupId === target.id)) return null;
    groupId = target.id;
  } else {
    const targetExpense = expenses.find((expense) => expense.id === target.id);
    if (!targetExpense || target.id === sourceId) return null;
    groupId = targetExpense.groupId ?? createGroupId();
  }
  if (source.groupId === groupId) return null;
  const regrouped = expenses.map((expense) => {
    if (expense.id === sourceId) return { ...expense, groupId };
    if (
      target.type === "expense" &&
      expense.id === target.id &&
      expense.groupId !== groupId
    )
      return { ...expense, groupId };
    return expense;
  });
  const movedSource = regrouped.find((expense) => expense.id === sourceId);
  const remaining = regrouped.filter((expense) => expense.id !== sourceId);
  let insertIndex = remaining.length;
  for (let index = remaining.length - 1; index >= 0; index -= 1) {
    if (remaining[index].groupId === groupId) {
      insertIndex = index + 1;
      break;
    }
  }
  return dissolveUndersizedGroups([
    ...remaining.slice(0, insertIndex),
    movedSource,
    ...remaining.slice(insertIndex),
  ]);
}

/**
 * Applies an edited group back onto its members: items carrying an expense id
 * update in place, new items become members, dropped members are removed, and
 * the group label and category are re-stamped group-wide. A single remaining
 * item renders loose again.
 */
export function applyExpenseGroupEdit(expenses, groupId, edit, createExpense) {
  const members = expenses.filter((expense) => expense.groupId === groupId);
  if (members.length === 0) return null;
  const membersById = new Map(members.map((member) => [member.id, member]));
  const category = edit.category || "other";
  const groupLabel = edit.label?.trim() || undefined;
  const lineItems = edit.lineItems.filter(
    (item) =>
      item.description.trim().length > 0 &&
      Number.isFinite(item.amount) &&
      item.amount >= 0,
  );
  if (lineItems.length === 0) return null;
  const keepGroup = lineItems.length >= 2;
  const updated = lineItems.map((item) => {
    const existing = item.expenseId
      ? membersById.get(item.expenseId)
      : undefined;
    const base = existing
      ? {
          ...existing,
          amount: item.amount,
          category,
          label: item.description.trim(),
        }
      : createExpense({
          amount: item.amount,
          category,
          label: item.description.trim(),
        });
    const { groupId: _groupId, groupLabel: _groupLabel, ...rest } = base;
    return {
      ...rest,
      ...(keepGroup ? { groupId } : {}),
      ...(keepGroup && groupLabel ? { groupLabel } : {}),
    };
  });
  const memberIds = new Set(members.map((member) => member.id));
  const insertIndex = expenses.findIndex((expense) =>
    memberIds.has(expense.id),
  );
  const rest = expenses.filter((expense) => !memberIds.has(expense.id));
  return [
    ...rest.slice(0, insertIndex),
    ...updated,
    ...rest.slice(insertIndex),
  ];
}

export function resolveExpenseDropTarget(frames, sourceId, centerY) {
  for (const frame of frames) {
    if (frame.kind === "member") continue;
    if (frame.kind === "expense" && frame.id === sourceId) continue;
    if (centerY >= frame.y && centerY <= frame.y + frame.height)
      return { id: frame.id, type: frame.kind };
  }
  return { type: "none" };
}

// ---- guided budget -----------------------------------------------------------

export const GUIDED_SAVINGS_PERCENTAGE = 20;

function enteredExpenses(amounts) {
  return (
    amounts.rentAndUtilities +
    amounts.carExpenses +
    amounts.phoneExpenses +
    amounts.insurance +
    amounts.loanPayments +
    amounts.miscellaneousExpenses
  );
}

export function calculateSuggestedSavings(amounts) {
  const target = (amounts.monthlyIncome * GUIDED_SAVINGS_PERCENTAGE) / 100;
  const remaining = amounts.monthlyIncome - enteredExpenses(amounts);
  return Math.round(Math.max(0, Math.min(target, remaining)) * 100) / 100;
}

export function calculateRecommendedBudget(amounts) {
  return (
    amounts.monthlyIncome - enteredExpenses(amounts) - amounts.desiredSavings
  );
}

export function calculateTotalSpendingCap(amounts) {
  return amounts.monthlyIncome - amounts.desiredSavings;
}

// ---- notification times -------------------------------------------------------

export const NOTIFICATION_TIME_STEP_MINUTES = 15;

export function shiftNotificationTime(time, minuteDelta) {
  const total = time.hour * 60 + time.minute + minuteDelta;
  const normalized = ((total % 1440) + 1440) % 1440;
  return { hour: Math.floor(normalized / 60), minute: normalized % 60 };
}

export function notificationTimeToDate({ hour, minute }) {
  return new Date(2024, 0, 15, hour, minute);
}
