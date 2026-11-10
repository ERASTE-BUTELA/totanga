import { useMemo, useState } from "react"
import { Bell, BookOpen, CalendarDays, Check, Mail, Megaphone, Search, Settings, Shield, Users } from "lucide-react"
import { PreferenceSwitch, readPreferences, savePreferences } from "./accountPreferences.jsx"

const fieldClass = "w-full rounded-control border border-line bg-white px-3"

const ITEMS = []

export function NotificationsPage() {
  const [items, setItems] = useState(ITEMS)
  const [filter, setFilter] = useState("toutes")
  const [category, setCategory] = useState("")
  const [query, setQuery] = useState("")
  const [prefs, setPrefs] = useState(readPreferences)

  function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    savePreferences(next)
  }

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (filter === "non-lues" && item.read) return false
      if (filter === "systeme" && item.kind !== "systeme") return false
      if (category && item.kind !== category) return false
      const text = `${item.title} ${item.text}`.toLowerCase()
      return text.includes(query.trim().toLowerCase())
    })
  }, [items, filter, category, query])

  const unread = items.filter((item) => !item.read).length
  const system = items.filter((item) => item.kind === "systeme").length

  function markAll() {
    setItems((current) => current.map((item) => ({ ...item, read: true })))
  }

  const tabs = [
    { id: "toutes", label: `Toutes (${items.length})`, icon: Bell },
    { id: "non-lues", label: `Non lues (${unread})`, icon: Mail },
    { id: "systeme", label: `Système (${system})`, icon: Settings },
  ]

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Bell aria-hidden="true" className="text-violet" size={22} />
            Centre de notifications
          </h2>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet" onClick={markAll} disabled={unread === 0}>
            <Check aria-hidden="true" size={18} />
            Marquer tout comme lu
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selected = filter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                className={`inline-flex min-h-11 items-center gap-2 rounded-control px-4 font-semibold ${selected ? "bg-violet text-white" : "bg-lavender text-violet"}`}
                onClick={() => setFilter(tab.id)}
              >
                <Icon aria-hidden="true" size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="relative min-w-60 flex-1">
            <span className="sr-only">Rechercher une notification</span>
            <Search aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className={`${fieldClass} pl-10`} value={query} placeholder="Rechercher une notification…" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="min-w-52">
            <span className="sr-only">Catégorie</span>
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Toutes les catégories</option>
              <option value="catalogue">Catalogue</option>
              <option value="evenement">Événements</option>
              <option value="annonce">Annonces et publications</option>
              <option value="utilisateur">Utilisateurs</option>
              <option value="systeme">Système</option>
            </select>
          </label>
        </div>
        {visible.length === 0 ? (
          <p className="mt-4 rounded-control bg-lavender px-4 py-8 text-center text-heading">Aucune notification pour le moment.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {visible.map((item) => (
              <li key={item.id} className="rounded-control border border-line px-4 py-3">
                <p className="font-semibold text-heading">{item.title}</p>
                <p className="text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-muted">{items.length === 0 ? "0 notification" : `${visible.length} affichée${visible.length > 1 ? "s" : ""}`}</p>
      </article>
      <div className="grid gap-4">
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Bell aria-hidden="true" className="text-violet" size={22} />
            Préférences de notifications
          </h2>
          <p className="mt-1 text-muted">Ces choix restent dans l'administration. Aucun courriel n'est envoyé.</p>
          <div className="mt-3 grid gap-3">
            <Pref icon={BookOpen} title="Activités du catalogue" text="Ajout ou modification d'un livre." checked={prefs.catalog} label="Activités du catalogue" onChange={() => toggle("catalog")} />
            <Pref icon={CalendarDays} title="Événements" text="Publication et rappels." checked={prefs.events} label="Événements" onChange={() => toggle("events")} />
            <Pref icon={Megaphone} title="Annonces et publications" text="Nouvelles annonces et publications." checked={prefs.announcements} label="Annonces et publications" onChange={() => toggle("announcements")} />
            <Pref icon={Users} title="Utilisateurs" text="Création ou modification d'un compte." checked={prefs.people} label="Utilisateurs" onChange={() => toggle("people")} />
            <Pref icon={Shield} title="Notifications système" text="Sauvegardes et alertes techniques." checked={prefs.system} label="Notifications système" onChange={() => toggle("system")} />
          </div>
          <h3 className="mt-5 flex items-center gap-2 font-semibold text-heading">
            <Mail aria-hidden="true" className="text-violet" size={18} />
            Mode de réception
          </h3>
          <ul className="mt-2 grid gap-2">
            <li className="font-semibold text-heading">Dans la plateforme</li>
            <li className="text-muted">Le courriel et les notifications du navigateur ne sont pas utilisés.</li>
          </ul>
        </article>
        <article className="grid grid-cols-3 gap-2">
          <Summary value={items.length} label="Total" className="bg-lavender text-violet" />
          <Summary value={unread} label="Non lues" className="bg-[#fde7c7] text-gold" />
          <Summary value={system} label="Système" className="bg-available-soft text-available" />
        </article>
      </div>
    </div>
  )
}

function Pref({ icon: Icon, title, text, checked, label, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-start gap-2">
        <Icon aria-hidden="true" className="mt-1 shrink-0 text-violet" size={18} />
        <span>
          <span className="block font-semibold text-heading">{title}</span>
          <span className="block text-muted">{text}</span>
        </span>
      </span>
      <PreferenceSwitch checked={checked} label={label} onChange={onChange} />
    </div>
  )
}

function Summary({ value, label, className }) {
  return (
    <p className={`rounded-panel p-3 text-center ${className}`}>
      <span className="block text-section">{value}</span>
      <span className="font-semibold">{label}</span>
    </p>
  )
}
