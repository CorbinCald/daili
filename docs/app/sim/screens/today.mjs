// The Today tab (components/daili/screens/DailyScreen.tsx): the day's summary
// card, its expense list with long-press drag-to-group, the date navigator and
// the floating receipt/voice buttons.

import {
  buildExpenseSections,
  formatDateKey,
  getDailyBudgetSummary,
  getNextDate,
  getPreviousDate,
  isSameCalendarDate,
  resolveExpenseDropTarget,
} from "../budget.mjs";
import {
  formatCurrency,
  formatLongDate,
  formatShortMonthDay,
  formatWeekdayShortMonthDay,
  pluralItems,
} from "../format.mjs";
import { getExpenseCategoryMeta } from "../themes.mjs";
import {
  button,
  categoryBadge,
  h,
  icon,
  iconButton,
  illustratedIcon,
} from "../ui.mjs";
import { openAddExpenseSheet } from "../sheets/expense-form.mjs";
import { openDailyBreakdown } from "../sheets/daily-breakdown.mjs";
import { openGroupEditSheet } from "../sheets/group-edit.mjs";
import { bottomNavBar, fitFontSize, screenHeader } from "./shared.mjs";

const LONG_PRESS_MS = 320;
const DRAG_SLOP = 8;

function dailyBudgetCard({
  ctx,
  dailyBudget,
  hasData,
  hasPlan,
  kicker,
  onPress,
  rollover,
  selectedDate,
  totalSpent,
}) {
  const profile = ctx.profile;
  const effectiveBudget = dailyBudget + rollover;
  const remaining = effectiveBudget - totalSpent;
  const fillRatio =
    hasData && hasPlan && effectiveBudget > 0
      ? Math.max(0, Math.min(1, remaining / effectiveBudget))
      : 0;
  const barClass =
    fillRatio < 0.1 ? "is-danger" : fillRatio < 0.3 ? "is-warning" : "";
  const rolloverLabel =
    rollover === 0
      ? ""
      : rollover > 0
        ? `+${formatCurrency(rollover, profile)} carried from yesterday`
        : `${formatCurrency(rollover, profile)} from yesterday's overspend`;
  const remainingText = !hasPlan
    ? "PLAN UNAVAILABLE"
    : hasData
      ? formatCurrency(remaining, profile)
      : "No Data Yet!";
  const spentText = formatCurrency(totalSpent, profile);
  const remainingWidth = 272 - Math.max(70, spentText.length * 11) - 12;
  const remainingNode =
    hasPlan && hasData
      ? h(
          "span",
          {
            class: `s-remaining-amount${remaining < 0 ? " is-negative" : ""}`,
            style: {
              fontSize: `${fitFontSize(remainingText, remainingWidth, 32, 18)}px`,
            },
          },
          remainingText,
        )
      : h("span", { class: "s-remaining-amount-nodata" }, remainingText);
  return button(
    {
      "aria-label": `View daily budget breakdown for ${formatLongDate(selectedDate)}`,
      class: "s-summary-card",
      onClick: onPress,
    },
    h(
      "span",
      { class: "s-summary-top" },
      h(
        "span",
        { class: "s-remaining-block" },
        h("span", { class: "s-summary-kicker" }, kicker),
        remainingNode,
      ),
      h(
        "span",
        { class: "s-spent-block" },
        h("span", { class: "s-spent-label" }, "spent"),
        h("span", { class: "s-spent-amount" }, spentText),
      ),
    ),
    rollover !== 0
      ? h(
          "span",
          { class: `s-rollover-text${rollover < 0 ? " is-debt" : ""}` },
          rolloverLabel,
        )
      : h("span", { class: "s-rollover-spacer" }),
    h(
      "span",
      { class: "s-progress-track" },
      h("span", {
        class: `s-progress-fill ${barClass}`,
        style: { width: `${fillRatio * 100}%` },
      }),
    ),
  );
}

function expenseRow({ ctx, dateKey, expense, variant = "card" }) {
  const category = getExpenseCategoryMeta(expense.category);
  const row = h(
    "div",
    {
      class: `s-expense-row is-${variant}`,
      dataset: {
        dropId: expense.id,
        dropKind: variant === "member" ? "member" : "expense",
      },
    },
    button(
      {
        "aria-label": `View ${expense.label} expense details`,
        class: "s-expense-press",
        dataset: { dragId: expense.id },
        onClick: () => ctx.openExpenseDetails(expense, dateKey),
      },
      categoryBadge(category),
      h(
        "span",
        { class: "s-expense-text" },
        h("span", { class: "s-expense-label" }, expense.label),
        h("span", { class: "s-expense-time" }, expense.time),
      ),
      h(
        "span",
        { class: "s-expense-amount" },
        formatCurrency(expense.amount, ctx.profile),
      ),
    ),
    iconButton({
      ariaLabel: `Delete ${expense.label}`,
      className: "s-delete-button",
      fontSize: 23,
      glyph: "×",
      lineHeight: 24,
      onClick: () =>
        ctx.store.actions.deleteExpense(ctx.parseDate(dateKey), expense.id),
      size: 28,
    }),
  );
  return row;
}

function groupCard({ ctx, dateKey, group }) {
  const category = getExpenseCategoryMeta(group.category);
  const expanded = ctx.ui.today.expandedGroups.has(group.id);
  const members = h(
    "div",
    { class: "s-group-members", hidden: !expanded },
    ...group.members.map((member) =>
      expenseRow({ ctx, dateKey, expense: member, variant: "member" }),
    ),
  );
  const chevron = icon("chevron-forward", {
    size: 18,
    className: "s-group-chevron",
  });
  const toggle = button(
    {
      "aria-expanded": String(expanded),
      "aria-label": expanded
        ? `Hide items in ${group.label}`
        : `Show items in ${group.label}`,
      class: "s-group-toggle",
      onClick: () => {
        const next = !ctx.ui.today.expandedGroups.has(group.id);
        if (next) ctx.ui.today.expandedGroups.add(group.id);
        else ctx.ui.today.expandedGroups.delete(group.id);
        members.hidden = !next;
        toggle.setAttribute("aria-expanded", String(next));
        toggle.setAttribute(
          "aria-label",
          next
            ? `Hide items in ${group.label}`
            : `Show items in ${group.label}`,
        );
        card.classList.toggle("is-expanded", next);
      },
    },
    chevron,
  );
  const card = h(
    "div",
    {
      class: `s-group-card${expanded ? " is-expanded" : ""}`,
      dataset: { dropId: group.id, dropKind: "group" },
    },
    h(
      "div",
      { class: "s-group-header" },
      toggle,
      button(
        {
          "aria-label": `Edit group ${group.label}`,
          class: "s-group-press",
          onClick: () =>
            openGroupEditSheet(ctx, { date: ctx.parseDate(dateKey), group }),
        },
        categoryBadge(category),
        h(
          "span",
          { class: "s-expense-text" },
          h("span", { class: "s-group-label" }, group.label),
          h(
            "span",
            { class: "s-expense-time" },
            pluralItems(group.members.length),
          ),
        ),
        h(
          "span",
          { class: "s-group-total" },
          formatCurrency(group.total, ctx.profile),
        ),
        icon("create-outline", { size: 17, className: "s-group-edit-icon" }),
      ),
      iconButton({
        ariaLabel: `Delete group ${group.label}`,
        className: "s-delete-button",
        fontSize: 23,
        glyph: "×",
        lineHeight: 24,
        onClick: () =>
          ctx.store.actions.deleteExpenseGroup(
            ctx.parseDate(dateKey),
            group.id,
          ),
        size: 28,
      }),
    ),
    members,
  );
  return card;
}

/**
 * Long-press a row to lift it, drop it on another row to form a group, on a
 * group card to join it, or on empty space to leave its group. The list
 * scrolls normally when the finger moves before the press settles.
 */
function enableDragToGroup(list, { ctx, dateKey, expenses }) {
  let pending = null;
  let drag = null;
  const zoom = () => Number.parseFloat(getComputedStyle(ctx.root).zoom) || 1;
  list.addEventListener(
    "touchmove",
    (event) => {
      if (drag) event.preventDefault();
    },
    { passive: false },
  );
  list.addEventListener("pointerdown", (event) => {
    const press = event.target.closest("[data-drag-id]");
    if (!press || (event.pointerType === "mouse" && event.button !== 0)) return;
    const row = press.closest("[data-drop-id]");
    pending = {
      press,
      row,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
    pending.timer = window.setTimeout(() => {
      if (!pending) return;
      drag = { ...pending, moved: false };
      pending = null;
      drag.row.classList.add("is-dragging");
      list.classList.add("is-drag-active");
      try {
        list.setPointerCapture(drag.pointerId);
      } catch {
        // Capture is a nicety; the move handlers below still follow the pointer.
      }
    }, LONG_PRESS_MS);
  });
  const cancelPending = () => {
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pending = null;
  };
  list.addEventListener("pointermove", (event) => {
    if (
      pending &&
      Math.hypot(
        event.clientX - pending.startX,
        event.clientY - pending.startY,
      ) > DRAG_SLOP
    )
      cancelPending();
    if (!drag) return;
    drag.moved = true;
    const delta = (event.clientY - drag.startY) / zoom();
    drag.row.style.transform = `translateY(${delta}px)`;
    const centerY =
      drag.row.getBoundingClientRect().top +
      drag.row.getBoundingClientRect().height / 2;
    for (const candidate of list.querySelectorAll("[data-drop-kind]")) {
      const rect = candidate.getBoundingClientRect();
      const isTarget =
        candidate !== drag.row &&
        candidate.dataset.dropKind !== "member" &&
        centerY >= rect.top &&
        centerY <= rect.bottom &&
        !candidate.contains(drag.row);
      candidate.classList.toggle("is-drop-target", isTarget);
    }
  });
  const finish = (event) => {
    cancelPending();
    if (!drag) return;
    const active = drag;
    drag = null;
    // Measure while the lifted row still sits under the pointer.
    const liftedRect = active.row.getBoundingClientRect();
    const dropCenter = liftedRect.top + liftedRect.height / 2;
    // Every row and group card is a frame, including the group a dragged
    // member came from: dropping back inside it resolves to that same group,
    // which the store treats as no change rather than as leaving the group.
    const frames = [...list.querySelectorAll("[data-drop-kind]")].map(
      (candidate) => {
        const rect = candidate.getBoundingClientRect();
        return {
          height: rect.height,
          id: candidate.dataset.dropId,
          kind: candidate.dataset.dropKind,
          y: rect.top,
        };
      },
    );
    list.classList.remove("is-drag-active");
    active.row.classList.remove("is-dragging");
    active.row.style.transform = "";
    for (const candidate of list.querySelectorAll(".is-drop-target"))
      candidate.classList.remove("is-drop-target");
    try {
      list.releasePointerCapture(active.pointerId);
    } catch {
      // Nothing to release.
    }
    // A press that never moved is a tap, which the row's own click handles.
    if (event.type === "pointercancel" || !active.moved) return;
    ctx.suppressNextClick();
    const source = expenses.find(
      (expense) => expense.id === active.press.dataset.dragId,
    );
    if (!source) return;
    const target = resolveExpenseDropTarget(frames, source.id, dropCenter);
    if (target.type === "none" && !source.groupId) return;
    if (target.type === "group" && source.groupId === target.id) return;
    ctx.store.actions.dropExpense(ctx.parseDate(dateKey), source.id, target);
  };
  list.addEventListener("pointerup", finish);
  list.addEventListener("pointercancel", finish);
  list.addEventListener("pointerleave", cancelPending);
}

export function renderTodayScreen(ctx) {
  const state = ctx.state;
  const today = ctx.now();
  const selectedDate = ctx.ui.selectedDate;
  const summary = getDailyBudgetSummary({
    expensesByDate: state.expensesByDate,
    monthlyBudgetPlans: state.monthlyBudgetPlans,
    onboardingDateKey: state.onboardingDateKey,
    selectedDate,
  });
  const isToday = isSameCalendarDate(selectedDate, today);
  const isYesterday = isSameCalendarDate(selectedDate, getPreviousDate(today));
  const dateLabel = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : formatWeekdayShortMonthDay(selectedDate);
  const kicker = isToday
    ? "REMAINING TODAY"
    : isYesterday
      ? "REMAINING YESTERDAY"
      : `REMAINING ${formatShortMonthDay(selectedDate).toUpperCase()}`;
  const dateKey = formatDateKey(selectedDate);
  const showsScanButton = !state.receiptExtractionEnabled
    ? !state.receiptScanButtonHidden
    : true;
  const showsSpeechButton = state.speechEntryEnabled;

  const header = screenHeader(
    "Today",
    dailyBudgetCard({
      ctx,
      dailyBudget: summary.dailyBudget,
      hasData: summary.hasData,
      hasPlan: summary.hasPlan,
      kicker,
      onPress: () =>
        openDailyBreakdown(ctx, {
          dailyBudget: summary.dailyBudget,
          expenses: summary.expenses,
          hasData: summary.hasData,
          hasPlan: summary.hasPlan,
          rollover: summary.rollover,
          selectedDate,
          totalSpent: summary.totalSpent,
        }),
      rollover: summary.rollover,
      selectedDate,
      totalSpent: summary.totalSpent,
    }),
  );

  const list = h("div", {
    class: "s-scroll s-today-list",
    dataset: { scrollKey: "today" },
  });
  if (summary.expenses.length === 0) {
    list.append(
      h(
        "div",
        { class: "s-empty-state" },
        illustratedIcon("empty-state-tumbleweed.png", 205),
        h("p", { class: "s-empty-title" }, "No expenses yet"),
        h("p", { class: "s-empty-hint" }, "Tap + to add your first one"),
      ),
    );
  } else {
    const stack = h(
      "div",
      { class: "s-expense-stack" },
      ...buildExpenseSections(summary.expenses).map((section) =>
        section.type === "group"
          ? groupCard({ ctx, dateKey, group: section })
          : expenseRow({ ctx, dateKey, expense: section.expense }),
      ),
    );
    enableDragToGroup(stack, { ctx, dateKey, expenses: summary.expenses });
    list.append(stack);
  }

  const nav = bottomNavBar({
    addLabel: "Add expense",
    nextDisabled: isToday,
    nextLabel: "Next day",
    onAdd: () => openAddExpenseSheet(ctx, { date: selectedDate }),
    onNext: () => {
      if (!isToday) ctx.setSelectedDate(getNextDate(selectedDate));
    },
    onPrevious: () => ctx.setSelectedDate(getPreviousDate(selectedDate)),
    onTitle: () => ctx.setSelectedDate(ctx.now()),
    previousLabel: "Previous day",
    title: dateLabel,
    titleLabel: "Jump to today",
  });

  const floating = [];
  if (showsSpeechButton) {
    floating.push(
      button(
        {
          "aria-label": "Add expense by voice",
          class: `s-floating-button${showsScanButton ? " is-stacked" : ""}`,
          onClick: () => ctx.showUnavailable("voice"),
        },
        icon("mic-outline", { size: 24, color: "#ffffff" }),
      ),
    );
  }
  if (showsScanButton) {
    floating.push(
      button(
        {
          "aria-label": "Scan a receipt",
          class: "s-floating-button",
          onClick: () => ctx.showUnavailable("receipt"),
        },
        icon("receipt-outline", { size: 24, color: "#ffffff" }),
      ),
    );
  }

  return h(
    "div",
    { class: "s-screen s-today-screen" },
    header,
    list,
    nav,
    ...floating,
  );
}
