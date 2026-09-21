(() => {
  const storageKey = "daili-site-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const normalize = (value) =>
    value === "light" || value === "dark" ? value : "auto";
  let preference = "auto";
  try {
    preference = normalize(localStorage.getItem(storageKey));
  } catch {
    // The control still works for this visit when storage is unavailable.
  }

  function apply() {
    const theme =
      preference === "auto" ? (system.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.content = theme === "dark" ? "#101f2a" : "#f5f7f4";
    }
    for (const picker of document.querySelectorAll("[data-theme-picker]")) {
      picker.value = preference;
    }
  }

  apply();
  system.addEventListener("change", apply);
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = normalize(event.newValue);
    apply();
  });
  document.addEventListener("DOMContentLoaded", () => {
    for (const picker of document.querySelectorAll("[data-theme-picker]")) {
      picker.value = preference;
      picker.addEventListener("change", () => {
        preference = normalize(picker.value);
        try {
          if (preference === "auto") localStorage.removeItem(storageKey);
          else localStorage.setItem(storageKey, preference);
        } catch {
          // Keep applying the choice even if the browser refuses persistence.
        }
        apply();
      });
      picker.closest(".theme-picker").hidden = false;
    }
  });
})();
