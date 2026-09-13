// Onboarding (components/daili/onboarding/OnboardingScreen.tsx and
// GuidedBudgetFlow.tsx): welcome, the monthly spending cap, and the optional
// guided questions that calculate one.

import {
  calculateRecommendedBudget,
  calculateSuggestedSavings,
  calculateTotalSpendingCap,
  getDailyBudget,
} from "../budget.mjs";
import {
  formatCurrency,
  formatCurrencyInput,
  formatNumber,
  isBudgetAmount,
  parseCurrencyInput,
  sanitizeCurrencyInput,
} from "../format.mjs";
import { guidedFixedExpenseFields } from "../themes.mjs";
import {
  button,
  currencyInput,
  h,
  icon,
  iconButton,
  illustratedIcon,
  primaryButton,
} from "../ui.mjs";

const GUIDED_QUESTIONS = [
  {
    description:
      "Enter your monthly net income (take-home pay after taxes and deductions).",
    key: "monthlyIncome",
    label: "Monthly income",
  },
  {
    description: "Include rent or mortgage and utilities.",
    key: "rentAndUtilities",
    label: "Rent and utilities",
  },
  {
    description: "Include payments, fuel, parking, and maintenance.",
    key: "carExpenses",
    label: "Car expenses",
  },
  {
    description: "Enter your monthly phone service and device payments.",
    key: "phoneExpenses",
    label: "Phone expenses",
  },
  {
    description: "Include all monthly insurance premiums.",
    key: "insurance",
    label: "Insurance",
  },
  {
    description: "Enter the total of your monthly loan payments.",
    key: "loanPayments",
    label: "Loan payments",
  },
  {
    description:
      "Add other monthly costs that weren’t covered in previous steps.",
    key: "miscellaneousExpenses",
    label: "Miscellaneous expenses",
  },
  {
    description: "How much would you like to set aside each month?",
    key: "desiredSavings",
    label: "Desired monthly savings",
  },
];

function emphasized(text, className) {
  return text
    .split("**")
    .map((part, index) =>
      index % 2 === 1 ? h("strong", { class: className }, part) : part,
    );
}

function negativeBudgetNote(message) {
  return h(
    "div",
    {
      "aria-label": "Negative budget warning",
      class: "s-negative-note is-boxed",
    },
    message ??
      "This is a negative budget, so your daily budget will also be negative.",
  );
}

function renderGuidedFlow(ctx, { onCancel, onUseBudget }) {
  const profile = ctx.profile;
  // Answers and position live in the UI state, so a screen rebuilt by a
  // store or calendar refresh resumes exactly where the visitor was.
  const draft = (ctx.ui.onboarding.guided ??= {
    questionIndex: 0,
    values: Object.fromEntries(
      GUIDED_QUESTIONS.map((question) => [question.key, ""]),
    ),
  });
  const values = draft.values;
  const root = h("div", { class: "s-onboarding s-guided" });
  const parseValues = () =>
    Object.fromEntries(
      GUIDED_QUESTIONS.map((question) => [
        question.key,
        parseCurrencyInput(values[question.key], profile) || 0,
      ]),
    );
  const render = () => {
    const isReview = draft.questionIndex === GUIDED_QUESTIONS.length;
    const question = GUIDED_QUESTIONS[draft.questionIndex];
    const currentValue = question ? values[question.key] : "";
    const currentAmount = parseCurrencyInput(currentValue, profile);
    const canContinue =
      question !== undefined &&
      (currentValue === "" ||
        (currentAmount >= 0 && isBudgetAmount(currentAmount, profile)));
    const amounts = parseValues();
    const recommended = calculateRecommendedBudget(amounts);
    const totalCap = calculateTotalSpendingCap(amounts);
    const suggestedSavings = calculateSuggestedSavings(amounts);
    const canUse =
      isBudgetAmount(recommended, profile) && isBudgetAmount(totalCap, profile);
    const isShortfall = recommended < 0;
    const noBudget = recommended === 0;
    const goBack = () => {
      if (draft.questionIndex === 0) {
        onCancel();
        return;
      }
      draft.questionIndex -= 1;
      render();
    };
    const canContinueNow = () => {
      if (!question) return false;
      const draft = values[question.key];
      const amount = parseCurrencyInput(draft, profile);
      return draft === "" || (amount >= 0 && isBudgetAmount(amount, profile));
    };
    const goForward = () => {
      if (!canContinueNow()) return;
      if (values[question.key] === "") values[question.key] = "0";
      draft.questionIndex += 1;
      render();
    };
    const progress =
      Math.min(draft.questionIndex + 1, GUIDED_QUESTIONS.length) /
      GUIDED_QUESTIONS.length;
    let body;
    if (isReview) {
      const amountText = formatCurrency(
        isShortfall ? Math.abs(recommended) : recommended,
        profile,
      );
      body = h(
        "div",
        { class: "s-guided-review" },
        h(
          "h2",
          { class: "s-onboarding-step-title" },
          isShortfall
            ? "Monthly shortfall"
            : noBudget
              ? "No monthly budget remaining"
              : "Recommended discretionary budget",
        ),
        h("p", { class: "s-guided-recommendation" }, amountText),
        h(
          "p",
          { class: "s-guided-description" },
          isShortfall
            ? `Your planned expenses and savings goal exceed your net income by ${amountText} each month.`
            : noBudget
              ? "Your planned expenses and savings goal use all of your net income."
              : "This is your discretionary allowance after planned monthly costs and savings. Those costs stay inside your total spending cap and are subtracted once.",
        ),
        isShortfall
          ? negativeBudgetNote(
              `After planned costs and savings, this leaves ${formatCurrency(recommended, profile)} discretionary each month, so each day will begin with a negative allowance.`,
            )
          : null,
        !canUse
          ? h(
              "p",
              { class: "s-field-error" },
              "This recommendation is outside Daili’s supported budget range.",
            )
          : null,
      );
    } else {
      const input = currencyInput({
        ariaLabel: `${question.label} amount`,
        autoFocus: true,
        backgroundClass: "is-on-surface",
        inactiveBorder: "var(--accent-4d)",
        isActive: canContinue,
        onChange: (value) => {
          values[question.key] = value;
          const parsed = parseCurrencyInput(value, profile);
          const ok =
            value === "" || (parsed >= 0 && isBudgetAmount(parsed, profile));
          input.setActive(ok);
          cta.setDisabled(!ok);
        },
        onSubmit: goForward,
        placeholder: "0",
        profile,
        sanitize: sanitizeCurrencyInput,
        size: "large",
        value: currentValue,
      });
      body = h(
        "div",
        null,
        h("h2", { class: "s-onboarding-step-title" }, question.label),
        h("p", { class: "s-guided-description" }, question.description),
        question.key === "desiredSavings"
          ? button(
              {
                "aria-label": `Use suggested monthly savings of ${formatCurrency(suggestedSavings, profile)}`,
                class: "s-savings-suggestion",
                onClick: () => {
                  values.desiredSavings = formatCurrencyInput(
                    suggestedSavings,
                    profile,
                  );
                  render();
                },
              },
              h(
                "span",
                { class: "s-savings-copy" },
                h("span", { class: "s-savings-label" }, "Suggested"),
                h(
                  "span",
                  { class: "s-savings-guideline" },
                  "A common 20% guideline, capped by what remains after expenses.",
                ),
              ),
              h(
                "span",
                { class: "s-savings-amount" },
                formatCurrency(suggestedSavings, profile),
              ),
            )
          : null,
        input.el,
        h(
          "p",
          { class: "s-guided-input-hint" },
          "Monthly amount · leave blank if none",
        ),
      );
    }
    const cta = primaryButton({
      disabled: isReview ? !canUse : !canContinue,
      label: isReview
        ? isShortfall
          ? "Use negative budget"
          : "Use this budget"
        : draft.questionIndex === GUIDED_QUESTIONS.length - 1
          ? "See my budget"
          : "Continue",
      onClick: () =>
        isReview
          ? canUse
            ? onUseBudget(parseValues())
            : undefined
          : goForward(),
      rightLabel: "›",
      size: "large",
    });
    root.replaceChildren(
      h(
        "div",
        { class: "s-back-bar" },
        iconButton({
          ariaLabel:
            draft.questionIndex === 0
              ? "Return to budget entry"
              : "Previous budget question",
          className: "s-back-button",
          fontSize: 32,
          glyph: "‹",
          lineHeight: 32,
          onClick: goBack,
          size: 36,
        }),
      ),
      h(
        "div",
        { class: "s-guided-progress" },
        h(
          "div",
          {
            "aria-label": `Guided budget step ${Math.min(draft.questionIndex + 1, GUIDED_QUESTIONS.length)} of ${GUIDED_QUESTIONS.length}`,
            class: "s-guided-track",
          },
          h("span", {
            class: "s-guided-fill",
            style: { width: `${progress * 100}%` },
          }),
        ),
        h(
          "p",
          { class: "s-guided-progress-text" },
          isReview
            ? "YOUR PLAN"
            : `STEP ${draft.questionIndex + 1} OF ${GUIDED_QUESTIONS.length}`,
        ),
      ),
      h("div", { class: "s-scroll s-guided-content" }, body),
      h("div", { class: "s-cta-wrap" }, cta.el),
    );
  };
  render();
  return root;
}

export function renderOnboardingScreen(ctx) {
  const profile = ctx.profile;
  const root = h("div", { class: "s-onboarding-root" });
  // The draft.step, typed budget and guided answers persist in the UI state so a
  // refresh (a store change, or the calendar turning at midnight) never
  // sends an unfinished visitor back to the welcome pane.
  const draft = ctx.ui.onboarding;
  const render = () => {
    if (draft.showGuided) {
      root.replaceChildren(
        renderGuidedFlow(ctx, {
          onCancel: () => {
            draft.showGuided = false;
            draft.guided = null;
            render();
          },
          onUseBudget: (amounts) =>
            ctx.store.actions.completeOnboarding({
              guidedPlan: {
                income: amounts.monthlyIncome,
                recurringExpenses: guidedFixedExpenseFields
                  .filter(({ key }) => amounts[key] > 0)
                  .map(({ color, key, label }) => ({
                    amount: amounts[key],
                    color,
                    label,
                  })),
                savingsTarget: amounts.desiredSavings,
              },
              monthlyBudget: calculateTotalSpendingCap(amounts),
            }),
        }),
      );
      return;
    }
    const parsedBudget = parseCurrencyInput(draft.budgetText, profile);
    const hasValidBudget = isBudgetAmount(parsedBudget, profile);
    const cta = primaryButton({
      disabled: !(draft.step === 0 || hasValidBudget),
      label: draft.step === 1 ? "Start budgeting" : "Continue",
      onClick: () => {
        if (draft.step === 0) {
          draft.step = 1;
          render();
          return;
        }
        // Read the field again: typing since this render changed the draft.
        const budget = parseCurrencyInput(draft.budgetText, profile);
        if (isBudgetAmount(budget, profile))
          ctx.store.actions.completeOnboarding({ monthlyBudget: budget });
      },
      rightLabel: "›",
      size: "large",
    });
    let pane;
    if (draft.step === 0) {
      pane = h(
        "div",
        { class: "s-welcome" },
        h("img", {
          alt: "Daili mountain and wave logo",
          class: "s-welcome-logo",
          height: 132,
          src: "./assets/sim/splash-icon.png",
          width: 132,
        }),
        h("p", { class: "s-welcome-title" }, "Daili"),
        h("p", { class: "s-welcome-intro" }, "Take it one day at a time."),
        h(
          "div",
          { class: "s-feature-list" },
          ...[
            ["onboarding-feature-target.png", "Set a monthly budget"],
            ["onboarding-feature-coin.png", "Track daily spending"],
            ["onboarding-feature-vista.png", "See the bigger picture"],
          ].map(([file, text]) =>
            h(
              "div",
              { class: "s-feature-row" },
              h("span", { class: "s-feature-icon" }, illustratedIcon(file, 34)),
              h("span", { class: "s-feature-text" }, text),
            ),
          ),
        ),
        h(
          "div",
          { "aria-label": "On-device AI features note", class: "s-ai-note" },
          h(
            "p",
            { class: "s-ai-note-text" },
            ...emphasized(
              "**Scan receipts** right from the Today screen, or **add expenses by voice** (under “On-device AI” in Settings) using on-device, offline machine learning models.",
              "s-ai-note-emphasis",
            ),
          ),
        ),
      );
    } else {
      const dailyPreview = h(
        "div",
        {
          class: "s-daily-preview",
          hidden: !(hasValidBudget && parsedBudget >= 0),
        },
        h(
          "p",
          { class: "s-daily-preview-text" },
          ...emphasized(
            `That’s about **${formatCurrency(getDailyBudget(hasValidBudget ? parsedBudget : 0), profile)}** per day to work with.`,
            "s-daily-preview-amount",
          ),
        ),
      );
      const negative = h(
        "div",
        { hidden: !(hasValidBudget && parsedBudget < 0) },
        negativeBudgetNote(),
      );
      const input = currencyInput({
        allowNegative: true,
        ariaLabel: "Monthly spending cap",
        autoFocus: true,
        backgroundClass: "is-on-surface",
        inactiveBorder: "var(--accent-4d)",
        isActive: hasValidBudget,
        onChange: (value) => {
          draft.budgetText = value;
          const parsed = parseCurrencyInput(draft.budgetText, profile);
          const valid = isBudgetAmount(parsed, profile);
          input.setActive(valid);
          cta.setDisabled(!valid);
          dailyPreview.hidden = !(valid && parsed >= 0);
          dailyPreview.replaceChildren(
            h(
              "p",
              { class: "s-daily-preview-text" },
              ...emphasized(
                `That’s about **${formatCurrency(getDailyBudget(valid ? parsed : 0), profile)}** per day to work with.`,
                "s-daily-preview-amount",
              ),
            ),
          );
          negative.hidden = !(valid && parsed < 0);
        },
        placeholder: formatNumber(2000),
        profile,
        sanitize: sanitizeCurrencyInput,
        size: "large",
        value: draft.budgetText,
      });
      pane = h(
        "div",
        { class: "s-budget-step" },
        h(
          "h2",
          { class: "s-onboarding-step-title" },
          "What’s your total monthly spending cap?",
        ),
        h(
          "p",
          { class: "s-onboarding-step-description" },
          "Include fixed costs. Daili subtracts them once, then turns the rest into a daily allowance.",
        ),
        input.el,
        button(
          {
            "aria-label": "Calculate a monthly budget",
            class: "s-guided-entry",
            onClick: () => {
              draft.showGuided = true;
              render();
            },
          },
          h(
            "span",
            { class: "s-guided-entry-copy" },
            h("span", { class: "s-guided-entry-title" }, "Not sure?"),
            h(
              "span",
              { class: "s-guided-entry-text" },
              "Answer a few monthly questions to calculate a budget.",
            ),
            h(
              "span",
              { class: "s-guided-entry-action" },
              "Calculate my budget",
            ),
          ),
          h(
            "span",
            { class: "s-guided-entry-arrow" },
            icon("chevron-forward", {
              size: 20,
              className: "s-guided-entry-chevron",
            }),
          ),
        ),
        dailyPreview,
        negative,
      );
    }
    root.replaceChildren(
      h(
        "div",
        { class: "s-onboarding" },
        h(
          "div",
          { class: "s-back-bar" },
          draft.step > 0
            ? iconButton({
                ariaLabel: "Go back",
                className: "s-back-button",
                fontSize: 32,
                glyph: "‹",
                lineHeight: 32,
                onClick: () => {
                  draft.step = 0;
                  render();
                },
                size: 36,
              })
            : null,
        ),
        h(
          "div",
          { class: "s-progress-dots" },
          ...[0, 1].map((index) =>
            h("span", {
              "aria-label": index === 0 ? "Welcome" : "Monthly Budget",
              class: `s-progress-dot${draft.step === index ? " is-active" : ""}${draft.step >= index ? " is-complete" : ""}`,
            }),
          ),
        ),
        h(
          "div",
          { class: "s-scroll s-onboarding-content" },
          h("div", { class: "s-onboarding-pane" }, pane),
        ),
        h("div", { class: "s-cta-wrap is-onboarding" }, cta.el),
      ),
    );
  };
  render();
  return root;
}
