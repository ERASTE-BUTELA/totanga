export const INITIAL_PREFERENCES = {
  theme: "clair",
  compact: false,
  covers: true,
  motion: false,
  dateFormat: "long",
  timeFormat: "24",
  pageSize: "10",
  books: true,
  publications: true,
  events: true,
  announcements: true,
  people: false,
  digest: false,
  catalog: true,
  system: true,
}

let current = { ...INITIAL_PREFERENCES }
const listeners = new Set()

function publish() {
  listeners.forEach((listener) => listener(current))
}

export function readPreferences() {
  return current
}

export function savePreferences(next) {
  current = { ...next }
  publish()
}

export function resetPreferences() {
  current = { ...INITIAL_PREFERENCES }
  publish()
}

export function PreferenceSwitch({ checked, label, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`relative h-11 w-16 shrink-0 rounded-full ${checked ? "bg-violet" : "bg-line"} disabled:opacity-60`}
      onClick={() => onChange(!checked)}
    >
      <span className={`absolute top-1.5 h-8 w-8 rounded-full bg-panel shadow-card ${checked ? "left-7" : "left-1.5"}`} />
    </button>
  )
}
