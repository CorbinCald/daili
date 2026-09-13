// Sample data for the simulated phone: a plan that began two months before the
// visitor's own "today", a few months of ordinary purchases from a fixed-seed
// generator, and the same five entries the marketing capture shows for today.

import {
  addDays,
  formatDateKey,
  formatMonthKey,
  getExpenseTotal,
  getRolloverForDate,
} from "./budget.mjs";
import { createInitialState } from "./store.mjs";

const MONTHLY_SPENDING_CAP = 3200;
const MONTHLY_INCOME = 4000;
const HISTORY_DAYS = 60;
const SEED = 20260912;

export const sampleRecurringExpenses = [
  { amount: 980, color: "#7c3aed", id: "r-sample-rent", label: "Rent" },
  {
    amount: 120,
    color: "#2563eb",
    id: "r-sample-insurance",
    label: "Car insurance",
  },
  { amount: 45, color: "#0891b2", id: "r-sample-phone", label: "Phone" },
  { amount: 40, color: "#3db882", id: "r-sample-gym", label: "Gym" },
  {
    amount: 15,
    color: "#ec4899",
    id: "r-sample-streaming",
    label: "Streaming",
  },
];

/** Today's entries, matching the "Actual app · Sample day" capture. */
export const sampleTodayExpenses = [
  {
    amount: 4.75,
    category: "coffee",
    label: "Morning coffee",
    time: "8:12 AM",
  },
  { amount: 3.6, category: "transport", label: "Bus fare", time: "8:40 AM" },
  { amount: 13.4, category: "food", label: "Lunch", time: "12:45 PM" },
  { amount: 9.2, category: "other", label: "Bookshop", time: "3:05 PM" },
  { amount: 28.4, category: "groceries", label: "Groceries", time: "5:30 PM" },
];

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result =
      (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = [
  {
    category: "coffee",
    chance: 0.85,
    hours: [7, 9],
    labels: ["Morning coffee", "Coffee", "Flat white"],
    max: 5.75,
    min: 3.25,
  },
  {
    category: "transport",
    chance: 0.7,
    hours: [8, 9],
    labels: ["Bus fare", "Bus fare", "Train ticket"],
    max: 3.6,
    min: 2.75,
  },
  {
    category: "food",
    chance: 0.8,
    hours: [12, 13],
    labels: ["Lunch", "Lunch", "Sandwich", "Noodles"],
    max: 16,
    min: 9,
  },
  {
    category: "food",
    chance: 0.4,
    hours: [10, 16],
    labels: ["Bakery", "Snack", "Smoothie"],
    max: 8,
    min: 3.5,
  },
  {
    category: "groceries",
    chance: 0.5,
    hours: [17, 19],
    labels: ["Groceries", "Groceries", "Farmers market"],
    max: 62,
    min: 18,
  },
  {
    category: "other",
    chance: 0.45,
    hours: [14, 18],
    labels: [
      "Bookshop",
      "Pharmacy",
      "Haircut",
      "Movie tickets",
      "Gift",
      "Hardware store",
    ],
    max: 32,
    min: 6,
  },
  {
    category: "food",
    chance: 0.3,
    hours: [18, 20],
    labels: ["Dinner out", "Takeout", "Pizza night"],
    max: 36,
    min: 16,
  },
  {
    category: "transport",
    chance: 0.12,
    hours: [16, 18],
    labels: ["Parking", "Fuel"],
    max: 48,
    min: 6,
  },
];

function clockTime(random, [fromHour, toHour]) {
  const hour = fromHour + Math.floor(random() * (toHour - fromHour + 1));
  const minute = Math.floor(random() * 60);
  const date = new Date(2024, 0, 15, hour, minute);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .replace(/[  ]/g, " ");
}

function cents(value) {
  return Math.round(value * 100) / 100;
}

function generateDay(random, dateKey, index) {
  const expenses = [];
  const quietDay = random() < 0.08;
  if (quietDay) return expenses;
  POOL.forEach((entry, entryIndex) => {
    if (random() >= entry.chance) return;
    const amount = cents(entry.min + random() * (entry.max - entry.min));
    const label = entry.labels[Math.floor(random() * entry.labels.length)];
    expenses.push({
      amount,
      category: entry.category,
      id: `e-sample-${index}-${entryIndex}`,
      label,
      time: clockTime(random, entry.hours),
    });
  });
  if (dateKey.endsWith("-05") && random() < 0.9) {
    expenses.push({
      amount: cents(58 + random() * 30),
      category: "utilities",
      id: `e-sample-${index}-power`,
      label: "Electricity bill",
      time: "9:15 AM",
    });
  }
  if (dateKey.endsWith("-20") && random() < 0.9) {
    expenses.push({
      amount: 45,
      category: "utilities",
      id: `e-sample-${index}-net`,
      label: "Internet",
      time: "10:02 AM",
    });
  }
  return expenses.sort(
    (first, second) => timeOrder(first.time) - timeOrder(second.time),
  );
}

function timeOrder(time) {
  const match = /^(\d+):(\d+) (AM|PM)$/.exec(time);
  if (!match) return 0;
  const hour = (Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

/**
 * Nudges this month's history so today opens with a modest positive rollover:
 * the marketing capture shows an ahead-of-plan day, and a random walk over a
 * dozen days can land either side of that.
 */
function settleRollover(
  expensesByDate,
  today,
  discretionary,
  onboardingDateKey,
) {
  const monthPrefix = formatDateKey(today).slice(0, 8);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const rollover = getRolloverForDate(
      expensesByDate,
      today,
      discretionary,
      onboardingDateKey,
    );
    if (rollover >= 35 && rollover <= 95) return;
    const factor = rollover < 35 ? 0.94 : 1.06;
    for (const [dateKey, expenses] of Object.entries(expensesByDate)) {
      if (!dateKey.startsWith(monthPrefix) || dateKey >= formatDateKey(today))
        continue;
      expensesByDate[dateKey] = expenses.map((expense) => ({
        ...expense,
        amount: cents(expense.amount * factor),
      }));
    }
  }
}

export function createSampleState(now, themeName = "tide") {
  const random = mulberry32(SEED);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const onboardingDate = addDays(today, -HISTORY_DAYS);
  const onboardingDateKey = formatDateKey(onboardingDate);
  const expensesByDate = {};
  for (let offset = HISTORY_DAYS; offset >= 1; offset -= 1) {
    const date = addDays(today, -offset);
    const dateKey = formatDateKey(date);
    const expenses = generateDay(random, dateKey, HISTORY_DAYS - offset);
    if (expenses.length > 0) expensesByDate[dateKey] = expenses;
  }
  const discretionary =
    MONTHLY_SPENDING_CAP - getExpenseTotal(sampleRecurringExpenses);
  settleRollover(expensesByDate, today, discretionary, onboardingDateKey);
  expensesByDate[formatDateKey(today)] = sampleTodayExpenses.map(
    (expense, index) => ({
      ...expense,
      id: `e-sample-today-${index}`,
    }),
  );
  const plan = {
    fixedExpenses: sampleRecurringExpenses.map((expense) => ({ ...expense })),
    income: MONTHLY_INCOME,
    source: "manual",
    totalSpendingCap: MONTHLY_SPENDING_CAP,
  };
  return {
    ...createInitialState(themeName),
    expensesByDate,
    hasCompletedOnboarding: true,
    monthlyBudget: MONTHLY_SPENDING_CAP,
    monthlyBudgetPlans: { [formatMonthKey(onboardingDate)]: plan },
    notificationsEnabled: true,
    onboardingDateKey,
    recurringExpenses: sampleRecurringExpenses.map((expense) => ({
      ...expense,
    })),
  };
}
