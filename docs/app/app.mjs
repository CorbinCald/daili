const form = document.querySelector("#allowance-form");
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

if (form) {
  const output = document.querySelector("#daily-allowance");
  const detail = document.querySelector("#calculation-detail");
  const error = document.querySelector("#calculation-error");
  const update = () => {
    const cap = form.elements.monthly;
    const bills = form.elements.recurring;
    const days = Number(form.elements.days.value);
    const valid =
      cap.validity.valid &&
      bills.validity.valid &&
      [28, 29, 30, 31].includes(days);
    if (!valid) {
      output.value = "—";
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
      output.value = "—";
      detail.textContent = `${money.format(-remainingCents / 100)} over your monthly cap`;
      error.textContent =
        "Recurring expenses exceed this cap. Adjust the example to leave room for everyday spending.";
      error.hidden = false;
      return;
    }
    output.value = money.format(remainingCents / 100 / days);
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
for (const link of document.querySelectorAll("[data-play-link]")) {
  const target = new URL(link.href);
  target.searchParams.set("utm_source", source);
  target.searchParams.set("utm_campaign", `daili_relaunch_2026_${theme}`);
  link.href = target.href;
}
