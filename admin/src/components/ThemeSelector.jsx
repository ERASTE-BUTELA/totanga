import { Monitor, Moon, Sun } from "lucide-react"
import { THEME_OPTIONS } from "../lib/theme.js"
import { useTheme } from "../lib/useTheme.js"

const ICONS = { light: Sun, dark: Moon, system: Monitor }

export function ThemeSelector({ compact = false, className = "" }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Apparence"
      className={`inline-flex w-full rounded-control border border-line bg-panel p-0.5 ${className}`}
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = ICONS[option.id]
        const selected = theme === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            title={option.label}
            className={[
              "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[0.6rem] px-2 text-meta font-semibold",
              selected ? "bg-lavender text-violet" : "text-muted hover:text-ink",
              compact ? "px-2" : "",
            ].join(" ")}
            onClick={() => setTheme(option.id)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {compact ? <span className="sr-only">{option.label}</span> : option.label}
          </button>
        )
      })}
    </div>
  )
}
