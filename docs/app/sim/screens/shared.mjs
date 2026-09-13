// Pieces shared by the tab screens: the primary-coloured screen header, the
// bottom date/month navigator and a text-fitting helper standing in for the
// app's measured font sizing.

import { button, h, icon } from "../ui.mjs";

export function screenHeader(title, content) {
  return h(
    "div",
    { class: "s-screen-header" },
    h("h2", { class: "s-screen-title" }, title),
    h("div", { class: "s-screen-header-content" }, content),
  );
}

/** Shrinks a bold figure until it fits its column, like fitAmountFontSize. */
export function fitFontSize(
  text,
  availableWidth,
  maxFontSize,
  minFontSize,
  glyphWidth = 0.6,
) {
  const width = Math.max(1, text.length) * glyphWidth;
  return Math.max(
    minFontSize,
    Math.min(maxFontSize, Math.floor(availableWidth / width)),
  );
}

export function bottomNavBar({
  addLabel,
  nextDisabled = false,
  nextLabel,
  onAdd,
  onNext,
  onPrevious,
  onTitle,
  previousLabel,
  title,
  titleLabel,
}) {
  return h(
    "div",
    { class: "s-bottom-nav" },
    button(
      {
        "aria-label": titleLabel,
        class: "s-bottom-nav-title",
        onClick: onTitle,
      },
      title,
    ),
    h(
      "div",
      { class: "s-bottom-nav-row" },
      button(
        {
          "aria-label": previousLabel,
          class: "s-nav-pad is-left",
          onClick: onPrevious,
        },
        icon("chevron-back", { size: 24, color: "rgba(255,255,255,0.85)" }),
      ),
      h(
        "div",
        { class: "s-bottom-nav-gap" },
        button(
          { "aria-label": addLabel, class: "s-add-button", onClick: onAdd },
          h("span", { "aria-hidden": "true" }, "+"),
        ),
      ),
      button(
        {
          "aria-label": nextLabel,
          class: "s-nav-pad is-right",
          disabled: nextDisabled || undefined,
          onClick: onNext,
        },
        icon("chevron-forward", {
          size: 24,
          color: nextDisabled
            ? "rgba(255,255,255,0.25)"
            : "rgba(255,255,255,0.85)",
        }),
      ),
    ),
  );
}

export function hudGrid(cards) {
  const longest = Math.max(...cards.map((card) => card.value.length));
  const columnWidth = (312 - 12) / cards.length - 36;
  const fontSize = fitFontSize("x".repeat(longest), columnWidth, 26, 15);
  return h(
    "div",
    { class: "s-hud-grid" },
    ...cards.map((card) =>
      h(
        "div",
        { class: "s-hud-card" },
        h("p", { class: "s-hud-label" }, card.label),
        h(
          "p",
          {
            class: `s-hud-value${card.tone ? ` is-${card.tone}` : ""}`,
            style: { fontSize: `${fontSize}px` },
          },
          card.value,
        ),
        card.subtext ? h("p", { class: "s-hud-subtext" }, card.subtext) : null,
      ),
    ),
  );
}
