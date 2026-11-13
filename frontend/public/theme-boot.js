/* Applique le thème avant le premier rendu. Pas de script inline (CSP). */
(function () {
  var KEY = "totanga-theme"
  var theme = "light"
  try {
    var stored = localStorage.getItem(KEY)
    if (stored === "light" || stored === "dark" || stored === "system") theme = stored
  } catch (error) {
    /* stockage indisponible : rester en clair */
  }
  var resolved = theme
  if (theme === "system") {
    try {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } catch (error) {
      resolved = "light"
    }
  }
  document.documentElement.setAttribute("data-theme", theme)
  document.documentElement.setAttribute("data-color-scheme", resolved)
  document.documentElement.style.colorScheme = resolved
})()
