(function () {
  const storageKey = "cotar3d-theme";
  const root = document.documentElement;

  function savedTheme() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    const useDark = nextTheme === "dark";
    root.dataset.theme = nextTheme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = useDark ? "#0e1715" : "#f6f8f4";

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const action = useDark ? "Ativar tema claro" : "Ativar tema escuro";
      button.setAttribute("aria-label", action);
      button.setAttribute("title", action);
      button.setAttribute("aria-pressed", String(useDark));
    });
  }

  applyTheme(savedTheme());

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(root.dataset.theme);

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

        try {
          localStorage.setItem(storageKey, nextTheme);
        } catch {
          // The selected theme still works for the current page.
        }

        applyTheme(nextTheme);
      });
    });
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) applyTheme(event.newValue);
  });
})();
