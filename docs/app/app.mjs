import "./feature-videos.mjs";
import { mountDailiSimulation } from "./sim/app.mjs";

const form = document.querySelector("#allowance-form");
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

if (form) {
  const output = document.querySelector("#daily-allowance");
  const detail = document.querySelector("#calculation-detail");
  const error = document.querySelector("#calculation-error");
  const showAmount = (value) => {
    output.value = value;
    output.style.setProperty("--amount-length", String(value.length));
  };
  const update = () => {
    const cap = form.elements.monthly;
    const bills = form.elements.recurring;
    const days = Number(form.elements.days.value);
    const valid =
      cap.validity.valid &&
      bills.validity.valid &&
      [28, 29, 30, 31].includes(days);
    if (!valid) {
      showAmount("—");
      detail.textContent = "Add valid amounts to see your example.";
      error.textContent =
        "Enter amounts from $0 to $1,000,000, with up to two decimal places.";
      error.hidden = false;
      return;
    }
    // Integer cents avoid floating-point subtraction errors in ordinary amounts.
    const remainingCents =
      Math.round(Number(cap.value) * 100) -
      Math.round(Number(bills.value) * 100);
    if (remainingCents < 0) {
      showAmount("—");
      detail.textContent = `${money.format(-remainingCents / 100)} over your monthly cap`;
      error.textContent =
        "Recurring expenses exceed this cap. Adjust the example to leave room for everyday spending.";
      error.hidden = false;
      return;
    }
    showAmount(money.format(remainingCents / 100 / days));
    detail.textContent = `${money.format(remainingCents / 100)} for everyday spending ÷ ${days} days`;
    error.hidden = true;
    error.textContent = "";
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
  });
}

// Only fixed, non-identifying campaign labels leave this page. Never forward
// arbitrary query values, calculator inputs, gclid, wbraid, or gbraid.
const incoming = new URLSearchParams(location.search);
const theme = ["today", "private", "pace"].includes(incoming.get("theme"))
  ? incoming.get("theme")
  : "today";
const source =
  incoming.get("utm_source") === "google" &&
  incoming.get("utm_campaign") === "daili_relaunch_2026"
    ? "google"
    : "website";
const withCampaignLabels = (href) => {
  const target = new URL(href);
  target.searchParams.set("utm_source", source);
  target.searchParams.set("utm_campaign", `daili_relaunch_2026_${theme}`);
  return target.href;
};
for (const link of document.querySelectorAll("[data-play-link]")) {
  link.href = withCampaignLabels(link.href);
}

// The hero phone runs a simulated Daili with sample data. Receipt scanning and
// voice entry stay in the Android app; everything else works in the page, and
// nothing typed into it is sent anywhere or stored. Its own Play links carry
// the same allowlisted campaign labels as the page's CTAs.
const simulationMount = document.querySelector("[data-daili-sim] .sim-mount");
if (simulationMount) {
  const display = simulationMount.closest("[data-daili-sim]");
  try {
    mountDailiSimulation(simulationMount, {
      appVersion: display.dataset.appVersion,
      playUrl: withCampaignLabels(display.dataset.playUrl),
    });
  } catch (error) {
    console.error(
      "Daili simulation failed to start; keeping the capture.",
      error,
    );
  }
}
