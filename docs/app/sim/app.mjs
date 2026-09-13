// Mounts the simulated Daili phone into the landing page's hero frame: an
// in-memory store seeded with sample data, the three tabs with their dissolve
// and swipe navigation, the pushed routes and sheets, and the theme painter.

import { formatDateKey, parseDateKey } from "./budget.mjs";
import { createCurrencyProfile } from "./format.mjs";
import { createOverlayHost } from "./overlay.mjs";
import { createSampleState } from "./seed.mjs";
import { createStore } from "./store.mjs";
import { darkThemeNames, themes, themeVariables } from "./themes.mjs";
import { button, h, icon } from "./ui.mjs";
import {
  openInfoDialog,
  openReceiptPrompt,
  openUnavailableFeature,
} from "./sheets/dialogs.mjs";
import { openExpenseDetails } from "./screens/expense-details.mjs";
import { renderLongTermScreen } from "./screens/long-term.mjs";
import { renderOnboardingScreen } from "./screens/onboarding.mjs";
import { renderSettingsScreen } from "./screens/settings.mjs";
import { renderTodayScreen } from "./screens/today.mjs";

export const SIM_WIDTH = 360;
const TAB_FADE_MS = 200;
const SWIPE_DISTANCE = 48;
const SWIPE_EDGE_GUARD = 24;

const TABS = [
  {
    icon: "today-outline",
    id: "today",
    label: "Today",
    render: renderTodayScreen,
  },
  {
    icon: "calendar-outline",
    id: "long-term",
    label: "Long-Term",
    render: renderLongTermScreen,
  },
  {
    icon: "settings-outline",
    id: "settings",
    label: "Settings",
    render: renderSettingsScreen,
  },
];

const UNAVAILABLE = {
  camera: {
    description: "Taking pictures is only available in the Android app.",
    title: "Camera unavailable",
  },
  receipt: {
    description:
      "Receipt scanning runs an on-device model with the phone's camera, so it is only available in the Android app.",
    title: "Receipt scanning unavailable",
  },
  voice: {
    description:
      "Voice expense entry runs an on-device speech model with the phone's microphone, so it is only available in the Android app.",
    title: "Voice entry unavailable",
  },
};

function createUiState(now) {
  return {
    longTerm: {
      addFormOpen: false,
      chartRange: "month",
      incomeDraft: null,
      incomeFormOpen: false,
      recurringDraft: null,
      selectedMonth: null,
    },
    onboarding: { budgetText: "", guided: null, showGuided: false, step: 0 },
    scroll: {},
    settings: { drafts: {} },
    selectedDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    tab: "today",
    today: { expandedGroups: new Set() },
  };
}

function preferredThemeName() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "moonlight"
    : "tide";
}

export function mountDailiSimulation(
  mount,
  {
    appVersion = "",
    playUrl = "https://play.google.com/store/apps/details?id=com.corbincald.daili",
  } = {},
) {
  const now = () => new Date();
  const store = createStore(createSampleState(now()), now);
  const root = h("div", {
    class: "sim-root",
    tabindex: "-1",
    "aria-label": "Simulated Daili app",
  });
  const screenLayer = h("div", { class: "sim-screen-layer" });
  const tabBar = h("nav", { "aria-label": "Daili tabs", class: "sim-tab-bar" });
  const overlayLayer = h("div", { class: "sim-overlay-layer" });
  root.append(screenLayer, tabBar, overlayLayer);
  const host = createOverlayHost(overlayLayer);
  const display = mount.closest(".phone-display") ?? mount.parentElement;
  const statusClock = display?.querySelector(
    ".phone-status-bar > span:first-child",
  );
  let ui = createUiState(now());
  let profileCache = { code: null, profile: null };
  let suppressClick = false;
  let currentScreen = null;
  let currentTab = null;
  let renderQueued = false;

  const ctx = {
    appVersion,
    host,
    now,
    playUrl,
    root,
    store,
    get state() {
      return store.getState();
    },
    get profile() {
      const code = store.getState().currencyCode ?? "USD";
      if (profileCache.code !== code)
        profileCache = { code, profile: createCurrencyProfile(code) };
      return profileCache.profile;
    },
    get theme() {
      return themes[store.getState().themeName] ?? themes.tide;
    },
    get ui() {
      return ui;
    },
    parseDate: (dateKey) => parseDateKey(dateKey) ?? now(),
    rerender: () => scheduleRender(),
    setSelectedDate(date) {
      ui.selectedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      if (ui.tab !== "today") switchTab("today");
      else scheduleRender();
    },
    /**
     * Brings `selector` inside the tab's scroller into view after a render.
     * Only the phone's own scroller moves: `Element.scrollIntoView` would
     * also scroll the landing page around the phone.
     */
    scrollIntoView(key, selector) {
      requestAnimationFrame(() => {
        const scroller = screenLayer.querySelector(
          `[data-scroll-key="${key}"]`,
        );
        if (!scroller) return;
        const target = scroller.querySelector(selector);
        if (!target) {
          scroller.scrollTo({ behavior: "smooth", top: scroller.scrollHeight });
          return;
        }
        // Rects are measured through the frame's CSS zoom; scroll offsets
        // are in the phone's own 360×800 units.
        const zoom = Number(root.style.getPropertyValue("--sim-zoom")) || 1;
        const offset =
          (target.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top) /
          zoom;
        scroller.scrollTo({
          behavior: "smooth",
          top: scroller.scrollTop + offset,
        });
      });
    },
    openExpenseDetails: (expense, dateKey) =>
      openExpenseDetails(ctx, { dateKey, expense }),
    showUnavailable(kind) {
      if (kind === "receipt") openReceiptPrompt(ctx);
      else openUnavailableFeature(ctx, UNAVAILABLE[kind] ?? UNAVAILABLE.camera);
    },
    showInfo: (title, message) => openInfoDialog(ctx, { message, title }),
    resetApp() {
      host.closeAll();
      ui = createUiState(now());
      store.actions.resetApp(preferredThemeName());
    },
    suppressNextClick() {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    },
  };

  root.addEventListener(
    "click",
    (event) => {
      if (suppressClick) {
        event.stopPropagation();
        event.preventDefault();
        suppressClick = false;
      }
    },
    true,
  );

  function paintTheme() {
    const theme = ctx.theme;
    for (const [name, value] of Object.entries(themeVariables(theme)))
      root.style.setProperty(name, value);
    root.style.setProperty("--accent-4d", `${theme.accent}4d`);
    root.classList.toggle("is-dark", darkThemeNames.has(theme.name));
    if (display) display.style.setProperty("--sim-primary", theme.primary);
  }

  function rememberScroll() {
    for (const scroller of screenLayer.querySelectorAll("[data-scroll-key]"))
      ui.scroll[scroller.dataset.scrollKey] = scroller.scrollTop;
  }

  function restoreScroll(screen) {
    for (const scroller of screen.querySelectorAll("[data-scroll-key]")) {
      const top = ui.scroll[scroller.dataset.scrollKey];
      if (top) scroller.scrollTop = top;
    }
  }

  // The tab buttons are built once and only their selection state changes on
  // later renders, so a tab activated from the keyboard keeps focus while its
  // screen is swapped underneath.
  const tabButtons = TABS.map((tab) =>
    button(
      {
        "aria-label": tab.label,
        "aria-selected": "false",
        class: "sim-tab",
        role: "tab",
        onClick: () => switchTab(tab.id),
      },
      h("span", { class: "sim-tab-icon" }, icon(tab.icon, { size: 25 })),
      h("span", { class: "sim-tab-label" }, tab.label),
    ),
  );
  const tabGroup = h(
    "div",
    { class: "sim-tab-group", role: "tablist" },
    h("span", { "aria-hidden": "true", class: "sim-tab-pill" }),
    ...tabButtons,
  );
  tabBar.append(tabGroup);

  function renderTabBar() {
    const state = store.getState();
    if (!state.hasCompletedOnboarding) {
      tabBar.hidden = true;
      return;
    }
    tabBar.hidden = false;
    const selectedIndex = TABS.findIndex((tab) => tab.id === ui.tab);
    tabGroup.style.setProperty("--tab-index", String(selectedIndex));
    tabButtons.forEach((tabButton, index) => {
      const selected = index === selectedIndex;
      tabButton.classList.toggle("is-selected", selected);
      tabButton.setAttribute("aria-selected", String(selected));
    });
  }

  function buildScreen() {
    const state = store.getState();
    if (!state.hasCompletedOnboarding) return renderOnboardingScreen(ctx);
    const tab = TABS.find((entry) => entry.id === ui.tab) ?? TABS[0];
    return tab.render(ctx);
  }

  function render({ transition = false } = {}) {
    paintTheme();
    const state = store.getState();
    const key = state.hasCompletedOnboarding ? ui.tab : "onboarding";
    if (currentScreen && key === currentTab && !transition) {
      rememberScroll();
      const focused = document.activeElement;
      const focusKey =
        focused && root.contains(focused)
          ? focused.getAttribute("aria-label")
          : null;
      const next = buildScreen();
      currentScreen.replaceWith(next);
      currentScreen = next;
      restoreScroll(next);
      if (focusKey) {
        const again = next.querySelector(
          `[aria-label="${focusKey.replace(/"/g, '\\"')}"]`,
        );
        if (again && typeof again.focus === "function")
          again.focus({ preventScroll: true });
      }
    } else {
      rememberScroll();
      const previous = currentScreen;
      const next = buildScreen();
      next.classList.add("is-entering");
      screenLayer.append(next);
      currentScreen = next;
      currentTab = key;
      restoreScroll(next);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => next.classList.remove("is-entering")),
      );
      if (previous) {
        // The departing screen only fades; it must not catch taps or focus.
        previous.classList.add("is-leaving");
        previous.setAttribute("aria-hidden", "true");
        previous.inert = true;
        window.setTimeout(() => previous.remove(), TAB_FADE_MS);
      }
    }
    renderTabBar();
  }

  function scheduleRender(options) {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      render(options);
    });
  }

  function switchTab(tabId) {
    if (ui.tab === tabId) return;
    ui.tab = tabId;
    render({ transition: true });
  }

  // Horizontal swipes move between tabs, like the app's swipe navigator.
  let swipe = null;
  screenLayer.addEventListener("pointerdown", (event) => {
    if (
      host.depth > 0 ||
      event.target.closest(".s-plot, input, textarea, select, .is-drag-active")
    )
      return;
    const rect = root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIM_WIDTH;
    if (x <= SWIPE_EDGE_GUARD || x >= SIM_WIDTH - SWIPE_EDGE_GUARD) return;
    swipe = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
    };
  });
  screenLayer.addEventListener("pointerup", (event) => {
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = ((event.clientX - swipe.startX) / swipe.width) * SIM_WIDTH;
    const dy = ((event.clientY - swipe.startY) / swipe.width) * SIM_WIDTH;
    swipe = null;
    if (
      Math.abs(dx) < SWIPE_DISTANCE ||
      Math.abs(dx) < Math.abs(dy) * 1.2 ||
      !store.getState().hasCompletedOnboarding
    )
      return;
    if (screenLayer.querySelector(".is-drag-active")) return;
    const index = TABS.findIndex((tab) => tab.id === ui.tab);
    const nextIndex = dx < 0 ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= TABS.length) return;
    ctx.suppressNextClick();
    switchTab(TABS[nextIndex].id);
  });
  screenLayer.addEventListener("pointercancel", () => {
    swipe = null;
  });

  store.subscribe(() => scheduleRender());

  function fit() {
    const width = mount.clientWidth;
    if (width > 0)
      root.style.setProperty("--sim-zoom", String(width / SIM_WIDTH));
  }

  // A page left open past midnight must move on with the date: a selected
  // day that was "today" advances so a new entry lands on the new day, and
  // the screens re-derive their labels and pace from the current date.
  let currentDayKey = formatDateKey(now());
  function followCalendar() {
    const dayKey = formatDateKey(now());
    if (dayKey === currentDayKey) return;
    if (formatDateKey(ui.selectedDate) === currentDayKey) {
      const today = now();
      ui.selectedDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
    }
    currentDayKey = dayKey;
    scheduleRender();
  }

  function tickClock() {
    followCalendar();
    if (!statusClock) return;
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(now());
    statusClock.textContent = time.replace(/\s?(AM|PM)$/i, "");
  }

  mount.replaceChildren(root);
  mount.classList.add("is-simulated");
  fit();
  if (typeof ResizeObserver === "function")
    new ResizeObserver(fit).observe(mount);
  else window.addEventListener("resize", fit);
  tickClock();
  window.setInterval(tickClock, 30_000);
  // Background tabs throttle timers, so catch up as soon as the page returns.
  document.addEventListener("visibilitychange", tickClock);
  render();
  mount.dataset.simReady = "true";
  return { ctx, store };
}
