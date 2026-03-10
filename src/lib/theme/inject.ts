export function injectThemeScript() {
  // this script can't access the global scope of this file (presumably because
  // of the way the app is bundled) so some values are redefined inside here
  const STORAGE_KEY = "haus.theme"

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- must be inside for inline script injection
  function updateDOM(theme: string) {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    document.documentElement.style.colorScheme = theme
  }

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- must be inside for inline script injection
  function getSystemTheme(evt?: MediaQueryList | MediaQueryListEvent) {
    const event = evt ?? globalThis.matchMedia("(prefers-color-scheme: dark)")
    const prefersDark = event.matches
    const systemTheme = prefersDark ? "dark" : "light"
    return systemTheme
  }

  try {
    const curTheme = localStorage.getItem(STORAGE_KEY) || "system"

    const isSystem = curTheme === "system"

    const theme = isSystem ? getSystemTheme() : curTheme

    updateDOM(theme)
  } catch (error) {
    console.error(error)
  }
}
