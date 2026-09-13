// In-memory state for the simulated phone, with the same action semantics as
// the app's hooks/useDailiStateActions.ts. Nothing is persisted: the website
// promises that visitors' inputs never leave the page or reach storage.

import {
  applyExpenseDrop,
  applyExpenseGroupEdit,
  createMonthlyBudgetPlan,
  formatDateKey,
  formatMonthKey,
  resolveMonthlyBudgetPlan,
  setMonthlyBudgetPlan,
} from "./budget.mjs";
import {
  createCurrencyProfile,
  formatClockTime,
  roundToProfile,
} from "./format.mjs";
import { normalizeThemeName } from "./themes.mjs";

export const DEFAULT_DAILY_REMINDER_TIME = { hour: 20, minute: 0 };
export const DEFAULT_MORNING_RUNDOWN_TIME = { hour: 8, minute: 0 };

let idCounter = 0;

export function createUniqueId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function createInitialState(themeName = "tide") {
  return {
    androidBackupEnabled: false,
    currencyCode: "USD",
    dailyReminderTime: { ...DEFAULT_DAILY_REMINDER_TIME },
    exchangeRates: {},
    expensesByDate: {},
    hasCompletedOnboarding: false,
    monthlyBudget: null,
    monthlyBudgetPlans: {},
    morningRundownEnabled: false,
    morningRundownTime: { ...DEFAULT_MORNING_RUNDOWN_TIME },
    notificationsEnabled: false,
    onboardingDateKey: null,
    receiptExtractionEnabled: false,
    receiptScanButtonHidden: false,
    recurringExpenses: [],
    speechEntryEnabled: false,
    speechModelTier: "tiny",
    themeName,
  };
}

function updatePlanFixedExpenses(state, fixedExpenses, now) {
  if (state.monthlyBudget === null) return state.monthlyBudgetPlans;
  const resolved = resolveMonthlyBudgetPlan(
    state.monthlyBudgetPlans,
    now.getFullYear(),
    now.getMonth(),
  )?.plan;
  const plan = createMonthlyBudgetPlan({
    fixedExpenses,
    ...(resolved?.income !== undefined ? { income: resolved.income } : {}),
    ...(resolved?.savingsTarget !== undefined
      ? { savingsTarget: resolved.savingsTarget }
      : {}),
    source: resolved?.source ?? "manual",
    totalSpendingCap: state.monthlyBudget,
  });
  return setMonthlyBudgetPlan(
    state.monthlyBudgetPlans,
    formatMonthKey(now),
    plan,
  );
}

function convertAmount(amount, rate, profile) {
  return roundToProfile(amount * rate, profile);
}

/**
 * Creates the store. `now()` supplies the clock so the seed and the screens
 * agree on "today"; actions read it when they need the current month.
 */
export function createStore(initialState, now = () => new Date()) {
  let state = initialState;
  const listeners = new Set();

  function setState(updater) {
    const next = typeof updater === "function" ? updater(state) : updater;
    if (!next || next === state) return false;
    state = next;
    for (const listener of [...listeners]) listener(state);
    return true;
  }

  const actions = {
    completeOnboarding({ guidedPlan, monthlyBudget }) {
      if (!Number.isFinite(monthlyBudget)) return false;
      return setState((current) => {
        const today = now();
        const recurringExpenses = guidedPlan
          ? guidedPlan.recurringExpenses.map((expense) => ({
              ...expense,
              id: createUniqueId("r"),
            }))
          : current.recurringExpenses;
        const plan = createMonthlyBudgetPlan({
          fixedExpenses: recurringExpenses,
          ...(guidedPlan
            ? {
                income: guidedPlan.income,
                savingsTarget: guidedPlan.savingsTarget,
              }
            : {}),
          source: guidedPlan ? "guided" : "manual",
          totalSpendingCap: monthlyBudget,
        });
        return {
          ...current,
          hasCompletedOnboarding: true,
          monthlyBudget,
          monthlyBudgetPlans: setMonthlyBudgetPlan(
            current.monthlyBudgetPlans,
            formatMonthKey(today),
            plan,
          ),
          onboardingDateKey: current.onboardingDateKey ?? formatDateKey(today),
          recurringExpenses,
        };
      });
    },

    updateMonthlyBudget(monthlyBudget) {
      if (!Number.isFinite(monthlyBudget)) return false;
      return setState((current) => {
        const today = now();
        const resolved = resolveMonthlyBudgetPlan(
          current.monthlyBudgetPlans,
          today.getFullYear(),
          today.getMonth(),
        )?.plan;
        const capUnchanged =
          resolved !== undefined && resolved.totalSpendingCap === monthlyBudget;
        const plan = createMonthlyBudgetPlan({
          fixedExpenses: current.recurringExpenses,
          ...(resolved?.income !== undefined
            ? { income: resolved.income }
            : {}),
          ...(capUnchanged && resolved.savingsTarget !== undefined
            ? { savingsTarget: resolved.savingsTarget }
            : {}),
          source: capUnchanged ? resolved.source : "manual",
          totalSpendingCap: monthlyBudget,
        });
        return {
          ...current,
          monthlyBudget,
          monthlyBudgetPlans: setMonthlyBudgetPlan(
            current.monthlyBudgetPlans,
            formatMonthKey(today),
            plan,
          ),
        };
      });
    },

    updateMonthlyIncome(monthlyIncome) {
      if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) return false;
      return setState((current) => {
        const today = now();
        const resolved = resolveMonthlyBudgetPlan(
          current.monthlyBudgetPlans,
          today.getFullYear(),
          today.getMonth(),
        )?.plan;
        if (!resolved || resolved.income === monthlyIncome) return current;
        const plan = createMonthlyBudgetPlan({
          fixedExpenses: resolved.fixedExpenses,
          income: monthlyIncome,
          ...(resolved.savingsTarget !== undefined
            ? { savingsTarget: resolved.savingsTarget }
            : {}),
          source: resolved.source,
          totalSpendingCap: resolved.totalSpendingCap,
        });
        return {
          ...current,
          monthlyBudgetPlans: setMonthlyBudgetPlan(
            current.monthlyBudgetPlans,
            formatMonthKey(today),
            plan,
          ),
        };
      });
    },

    addExpense(date, expense) {
      const dateKey = formatDateKey(date);
      const created = {
        ...expense,
        id: createUniqueId("e"),
        time: formatClockTime(now()),
      };
      setState((current) => ({
        ...current,
        expensesByDate: {
          ...current.expensesByDate,
          [dateKey]: [...(current.expensesByDate[dateKey] ?? []), created],
        },
      }));
      return created;
    },

    deleteExpense(date, id) {
      const dateKey = formatDateKey(date);
      return setState((current) => {
        const expenses = current.expensesByDate[dateKey] ?? [];
        if (!expenses.some((expense) => expense.id === id)) return current;
        const remaining = expenses.filter((expense) => expense.id !== id);
        const expensesByDate = { ...current.expensesByDate };
        if (remaining.length > 0) expensesByDate[dateKey] = remaining;
        else delete expensesByDate[dateKey];
        return { ...current, expensesByDate };
      });
    },

    deleteExpenseGroup(date, groupId) {
      const dateKey = formatDateKey(date);
      return setState((current) => {
        const expenses = current.expensesByDate[dateKey] ?? [];
        if (!expenses.some((expense) => expense.groupId === groupId))
          return current;
        return {
          ...current,
          expensesByDate: {
            ...current.expensesByDate,
            [dateKey]: expenses.filter(
              (expense) => expense.groupId !== groupId,
            ),
          },
        };
      });
    },

    updateExpense(id, date, updates) {
      if (!Number.isFinite(updates.amount) || updates.amount < 0) return false;
      const targetKey = formatDateKey(date);
      return setState((current) => {
        const sourceKey = Object.keys(current.expensesByDate).find((key) =>
          current.expensesByDate[key].some((expense) => expense.id === id),
        );
        if (!sourceKey) return current;
        const existing = current.expensesByDate[sourceKey].find(
          (expense) => expense.id === id,
        );
        if (updates.amount === 0 && existing.amount !== 0) return current;
        const expensesByDate = { ...current.expensesByDate };
        if (sourceKey === targetKey) {
          expensesByDate[sourceKey] = expensesByDate[sourceKey].map(
            (expense) =>
              expense.id === id ? { ...expense, ...updates } : expense,
          );
        } else {
          const {
            groupId: _groupId,
            groupLabel: _groupLabel,
            ...moved
          } = { ...existing, ...updates };
          const remaining = expensesByDate[sourceKey].filter(
            (expense) => expense.id !== id,
          );
          if (remaining.length > 0) expensesByDate[sourceKey] = remaining;
          else delete expensesByDate[sourceKey];
          expensesByDate[targetKey] = [
            ...(expensesByDate[targetKey] ?? []),
            moved,
          ];
        }
        return { ...current, expensesByDate };
      });
    },

    dropExpense(date, sourceId, target) {
      const dateKey = formatDateKey(date);
      return setState((current) => {
        const expenses = applyExpenseDrop(
          current.expensesByDate[dateKey] ?? [],
          sourceId,
          target,
          () => createUniqueId("g"),
        );
        if (!expenses) return current;
        return {
          ...current,
          expensesByDate: { ...current.expensesByDate, [dateKey]: expenses },
        };
      });
    },

    updateExpenseGroup(date, groupId, edit) {
      const dateKey = formatDateKey(date);
      const time = formatClockTime(now());
      return setState((current) => {
        const expenses = applyExpenseGroupEdit(
          current.expensesByDate[dateKey] ?? [],
          groupId,
          edit,
          (input) => ({ ...input, id: createUniqueId("e"), time }),
        );
        if (!expenses) return current;
        return {
          ...current,
          expensesByDate: { ...current.expensesByDate, [dateKey]: expenses },
        };
      });
    },

    addRecurringExpense(expense) {
      const created = { ...expense, id: createUniqueId("r") };
      setState((current) => {
        const recurringExpenses = [...current.recurringExpenses, created];
        return {
          ...current,
          monthlyBudgetPlans: updatePlanFixedExpenses(
            current,
            recurringExpenses,
            now(),
          ),
          recurringExpenses,
        };
      });
      return created;
    },

    updateRecurringExpense(id, expense) {
      if (
        !Number.isFinite(expense.amount) ||
        expense.amount < 0 ||
        !expense.label.trim()
      )
        return false;
      return setState((current) => {
        const existing = current.recurringExpenses.find(
          (item) => item.id === id,
        );
        if (!existing || (expense.amount === 0 && existing.amount !== 0))
          return current;
        const recurringExpenses = current.recurringExpenses.map((item) =>
          item.id === id
            ? { ...item, ...expense, label: expense.label.trim() }
            : item,
        );
        return {
          ...current,
          monthlyBudgetPlans: updatePlanFixedExpenses(
            current,
            recurringExpenses,
            now(),
          ),
          recurringExpenses,
        };
      });
    },

    deleteRecurringExpense(id) {
      return setState((current) => {
        if (!current.recurringExpenses.some((expense) => expense.id === id))
          return current;
        const recurringExpenses = current.recurringExpenses.filter(
          (expense) => expense.id !== id,
        );
        return {
          ...current,
          monthlyBudgetPlans: updatePlanFixedExpenses(
            current,
            recurringExpenses,
            now(),
          ),
          recurringExpenses,
        };
      });
    },

    setThemeName(themeName) {
      return setState((current) => {
        const normalized = normalizeThemeName(themeName);
        return current.themeName === normalized
          ? current
          : { ...current, themeName: normalized };
      });
    },

    setSetting(key, value) {
      return setState((current) =>
        current[key] === value ? current : { ...current, [key]: value },
      );
    },

    /**
     * Switches currency, either keeping every saved number or converting them
     * all (expenses, recurring costs, caps, income and savings) with one rate.
     */
    changeCurrency({ from, mode, rate, to }) {
      if (from === to) return "invalid";
      const targetProfile = createCurrencyProfile(to);
      if (mode === "convert" && !(Number.isFinite(rate) && rate > 0))
        return "invalid";
      let outOfRange = false;
      // Keeping values only relabels saved numbers, so they are not checked
      // against the new currency's entry limit; converted amounts must fit it.
      const guard =
        mode === "convert"
          ? (amount) => {
              const converted = convertAmount(amount, rate, targetProfile);
              if (Math.abs(converted) > targetProfile.maxAmount)
                outOfRange = true;
              return converted;
            }
          : (amount) => amount;
      const expensesByDate = Object.fromEntries(
        Object.entries(state.expensesByDate).map(([dateKey, expenses]) => [
          dateKey,
          expenses.map((expense) => ({
            ...expense,
            amount: guard(expense.amount),
          })),
        ]),
      );
      const recurringExpenses = state.recurringExpenses.map((expense) => ({
        ...expense,
        amount: guard(expense.amount),
      }));
      const monthlyBudgetPlans = Object.fromEntries(
        Object.entries(state.monthlyBudgetPlans).map(([monthKey, plan]) => [
          monthKey,
          createMonthlyBudgetPlan({
            fixedExpenses: plan.fixedExpenses.map((expense) => ({
              ...expense,
              amount: guard(expense.amount),
            })),
            ...(plan.income !== undefined
              ? { income: guard(plan.income) }
              : {}),
            ...(plan.savingsTarget !== undefined
              ? { savingsTarget: guard(plan.savingsTarget) }
              : {}),
            source: plan.source,
            totalSpendingCap: guard(plan.totalSpendingCap),
          }),
        ]),
      );
      const monthlyBudget =
        state.monthlyBudget === null ? null : guard(state.monthlyBudget);
      if (outOfRange) return "out-of-range";
      setState((current) => ({
        ...current,
        currencyCode: to,
        // Both directions are remembered together, so the latest conversion
        // is offered whichever way the next change runs.
        exchangeRates:
          mode === "convert"
            ? {
                ...current.exchangeRates,
                [`${from}/${to}`]: { date: formatDateKey(now()), rate },
                [`${to}/${from}`]: {
                  date: formatDateKey(now()),
                  rate: 1 / rate,
                },
              }
            : current.exchangeRates,
        expensesByDate,
        monthlyBudget,
        monthlyBudgetPlans,
        recurringExpenses,
      }));
      return "saved";
    },

    resetApp(themeName) {
      return setState(createInitialState(themeName));
    },
  };

  return {
    actions,
    getState: () => state,
    setState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
