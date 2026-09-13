// Small confirmation and notice dialogs.

import { button, h, primaryButton } from "../ui.mjs";

/** The app's UnavailableFeatureModal, used here for Android-only features. */
export function openUnavailableFeature(ctx, { description, title }) {
  ctx.host.modal({
    render(close) {
      return h(
        "div",
        { class: "s-modal-card s-notice-card" },
        h("h2", { class: "s-modal-title" }, title),
        h("p", { class: "s-notice-text" }, description),
        h(
          "a",
          {
            class: "s-link-text",
            href: ctx.playUrl,
            rel: "noopener",
            target: "_blank",
          },
          "Get Daili on Google Play ↗",
        ),
        button(
          {
            "aria-label": `Close ${title.toLowerCase()} notice`,
            class: "s-notice-close",
            onClick: () => close(),
          },
          "Close",
        ),
      );
    },
  });
}

export function openInfoDialog(ctx, { message, title }) {
  ctx.host.modal({
    render(close) {
      return h(
        "div",
        { class: "s-modal-card s-notice-card is-left" },
        h("h2", { class: "s-modal-title" }, title),
        h("p", { class: "s-notice-text" }, message),
        button({ class: "s-notice-close", onClick: () => close() }, "Close"),
      );
    },
  });
}

export function openConfirmDialog(
  ctx,
  {
    cancelLabel = "Cancel",
    confirmLabel,
    danger = false,
    message,
    onConfirm,
    title,
  },
) {
  ctx.host.modal({
    role: "alertdialog",
    render(close) {
      return h(
        "div",
        { class: "s-modal-card s-confirm-card" },
        h("h2", { class: "s-modal-title" }, title),
        h("p", { class: "s-notice-text" }, message),
        h(
          "div",
          { class: "s-confirm-actions" },
          button(
            { class: "s-notice-close", onClick: () => close() },
            cancelLabel,
          ),
          button(
            {
              class: `s-confirm-button${danger ? " is-danger" : ""}`,
              onClick: () => {
                close();
                onConfirm();
              },
            },
            confirmLabel,
          ),
        ),
      );
    },
  });
}

/** The receipt model download prompt, redirected to the Android app. */
export function openReceiptPrompt(ctx) {
  ctx.host.modal({
    render(close) {
      const download = primaryButton({
        label: "Available in the Android app",
        onClick: () => window.open(ctx.playUrl, "_blank", "noopener"),
      });
      return h(
        "div",
        { class: "s-modal-card s-notice-card is-left" },
        h("h2", { class: "s-modal-title" }, "Turn on receipt scanning?"),
        h(
          "p",
          { class: "s-notice-text" },
          "Daili reads receipts with a local AI model that runs entirely on your phone — nothing leaves your device. This web demo cannot run the camera or the model, so receipt scanning stays in the Android app.",
        ),
        download.el,
        button({ class: "s-notice-close", onClick: () => close() }, "Not now"),
      );
    },
  });
}
