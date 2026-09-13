// Sheets, dialogs and pushed routes for the simulated phone. Every overlay is
// absolutely positioned inside the phone, animates in and out with CSS
// classes, and is dismissed by its own controls or the Escape key.

import { h } from "./ui.mjs";

const EXIT_DURATION_MS = 260;
const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const SCROLL_BODIES = ".s-scroll, .s-sheet-scroll";

/**
 * A scroll body that holds only text has nothing for Tab to land on, so the
 * focus cycle would skip it and a keyboard user could never reach the rows
 * below the fold. Such bodies join the cycle as named regions that scroll
 * with the arrow keys, the way Firefox treats every scroller.
 */
function exposeScrollBodies(content, heading) {
  for (const body of content.querySelectorAll(SCROLL_BODIES)) {
    if (body.querySelector(FOCUSABLE)) continue;
    body.tabIndex = 0;
    body.setAttribute("role", "region");
    if (
      heading &&
      !body.hasAttribute("aria-label") &&
      !body.hasAttribute("aria-labelledby")
    )
      body.setAttribute("aria-labelledby", heading.id);
  }
}

/**
 * Hosts the overlay stack. While anything is open, the screens and tab bar
 * beneath it are inert and keyboard focus lives inside the topmost overlay;
 * closing one restores focus to the control that opened it.
 */
export function createOverlayHost(layer) {
  const stack = [];
  const root = layer.closest(".sim-root");

  function coveredLayers() {
    return root
      ? [
          ...root.querySelectorAll(
            ":scope > .sim-screen-layer, :scope > .sim-tab-bar",
          ),
        ]
      : [];
  }

  function updateInert() {
    const top = stack[stack.length - 1];
    for (const element of coveredLayers()) element.inert = stack.length > 0;
    for (const entry of stack) entry.overlay.inert = entry !== top;
  }

  function focusInto(content) {
    if (content.contains(document.activeElement)) return;
    const target = content.querySelector(FOCUSABLE) ?? content;
    target.focus({ preventScroll: true });
  }

  function restoreFocus(opener) {
    const top = stack[stack.length - 1];
    if (top) {
      focusInto(top.overlay);
      return;
    }
    const target =
      opener?.isConnected && !opener.closest("[inert]") ? opener : root;
    target?.focus({ preventScroll: true });
  }

  let labelCounter = 0;

  function present({ className, kind, onDismiss, render, role }) {
    const content = h("div", {
      class: `s-overlay-content is-${kind}${className ? ` ${className}` : ""}`,
      tabindex: "-1",
    });
    const opener = document.activeElement;
    const overlay = h(
      "div",
      {
        class: `s-overlay is-${kind}`,
        role: role ?? (kind === "modal" ? "dialog" : "region"),
        "aria-modal": kind === "modal" ? "true" : undefined,
      },
      content,
    );
    let closed = false;
    const entry = {
      close(result) {
        if (closed) return;
        closed = true;
        const index = stack.indexOf(entry);
        if (index !== -1) stack.splice(index, 1);
        overlay.classList.remove("is-open");
        overlay.classList.add("is-closing");
        // A departing overlay can neither be tapped, keep focus, nor be
        // announced while it animates out.
        overlay.inert = true;
        overlay.setAttribute("aria-hidden", "true");
        updateInert();
        restoreFocus(opener);
        content.dispatchEvent(new CustomEvent("sim-overlay-closed"));
        onDismiss?.(result);
        window.setTimeout(() => overlay.remove(), EXIT_DURATION_MS);
      },
      overlay,
    };
    content.append(render(entry.close));
    // Name the dialog or region after its heading, since focus lands on a
    // control at once and the heading alone would not identify the surface.
    const heading = content.querySelector("h1, h2, h3");
    if (heading) {
      labelCounter += 1;
      if (!heading.id) heading.id = `sim-overlay-title-${labelCounter}`;
      overlay.setAttribute("aria-labelledby", heading.id);
    }
    exposeScrollBodies(content, heading);
    if (kind === "modal") {
      overlay.addEventListener("click", (event) => {
        // The centering wrapper fills the overlay, so a tap on the backdrop
        // reaches it rather than the overlay element itself.
        if (event.target === overlay || event.target === content) entry.close();
      });
    }
    layer.append(overlay);
    stack.push(entry);
    updateInert();
    // Focus moves in at once: making the screen inert blurs the opener, and
    // a keyboard user must never be left on <body> where Escape is lost.
    // Fields that focus themselves on open take over a moment later.
    focusInto(content);
    // Two frames so the initial transform paints before the transition runs.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => overlay.classList.add("is-open")),
    );
    return entry;
  }

  function focusableWithin(container) {
    return [...container.querySelectorAll(FOCUSABLE)].filter(
      (element) => element.getClientRects().length > 0,
    );
  }

  // Keyboard handling for the overlay stack. Escape closes the topmost
  // overlay, and Tab cycles within it: the screens beneath are inert, but the
  // landing page around the phone is not, so without a trap a modal's last
  // control would hand focus to the page behind the dialog.
  document.addEventListener("keydown", (event) => {
    if (stack.length === 0) return;
    const target = event.target;
    const insidePhone = root?.contains(target);
    const onDocument =
      target === document.body || target === document.documentElement;
    if (!insidePhone && !onDocument) return;
    const top = stack[stack.length - 1];
    if (event.key === "Escape") {
      event.preventDefault();
      top.close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = focusableWithin(top.overlay);
    if (focusable.length === 0) {
      event.preventDefault();
      top.overlay
        .querySelector(".s-overlay-content")
        ?.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const inside = top.overlay.contains(active);
    if (
      event.shiftKey ? !inside || active === first : !inside || active === last
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  });

  return {
    /** Full-height sheet that slides up from the bottom, like the app's modals. */
    sheet: (options) => present({ ...options, kind: "sheet" }),
    /** Centered card over a dimmed backdrop. */
    modal: (options) => present({ ...options, kind: "modal" }),
    /** A pushed route sliding in from the right, like the expense details page. */
    push: (options) => present({ ...options, kind: "push" }),
    closeAll() {
      for (const entry of [...stack]) entry.close();
    },
    get depth() {
      return stack.length;
    },
  };
}
