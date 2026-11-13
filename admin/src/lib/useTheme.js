import { useEffect, useState, useSyncExternalStore } from "react"
import { applyTheme, persistTheme, readStoredTheme, resolvedTheme } from "./theme.js"

function subscribe(onStoreChange) {
  const onTheme = () => onStoreChange()
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  window.addEventListener("totanga-theme", onTheme)
  window.addEventListener("storage", onTheme)
  media.addEventListener("change", onTheme)
  return () => {
    window.removeEventListener("totanga-theme", onTheme)
    window.removeEventListener("storage", onTheme)
    media.removeEventListener("change", onTheme)
  }
}

export function useTheme() {
  const [ready, setReady] = useState(false)
  const theme = useSyncExternalStore(subscribe, readStoredTheme, () => "system")
  const resolved = useSyncExternalStore(subscribe, () => resolvedTheme(readStoredTheme()), () => "light")

  useEffect(() => {
    function sync() {
      applyTheme(readStoredTheme())
    }
    sync()
    setReady(true)
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", sync)
    window.addEventListener("storage", sync)
    return () => {
      media.removeEventListener("change", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  return {
    theme,
    resolved,
    ready,
    setTheme: persistTheme,
  }
}
