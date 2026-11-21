import { useState } from "react"
import { Bell, CalendarDays, Check, Globe, Image, Layers, Monitor, Moon, RotateCcw, Sparkles, Sun, Type } from "lucide-react"
import { INITIAL_PREFERENCES, PreferenceSwitch, readPreferences, resetPreferences, savePreferences } from "./accountPreferences.jsx"

const fieldClass = "w-full rounded-control border border-line bg-panel px-3"

const THEMES = [
  { id: "clair", label: "Clair", icon: Sun },
  { id: "sombre", label: "Sombre", icon: Moon },
  { id: "systeme", label: "Système", icon: Monitor },
]

function Row({ icon: Icon, title, text, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="flex min-w-0 items-start gap-3">
        <Icon aria-hidden="true" className="mt-1 shrink-0 text-violet" size={18} />
        <span>
          <span className="block font-semibold text-heading">{title}</span>
          <span className="block text-muted">{text}</span>
        </span>
      </span>
      {children}
    </div>
  )
}

export function PreferencesPage() {
  const [form, setForm] = useState(readPreferences)
  const [notice, setNotice] = useState("")

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setNotice("")
  }

  function save(event) {
    event.preventDefault()
    savePreferences(form)
    setNotice("L'affichage est mis à jour sur cet écran. Le thème violet clair de Totanga reste appliqué.")
  }

  function reset() {
    resetPreferences()
    setForm({ ...INITIAL_PREFERENCES })
    setNotice("")
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      {notice ? <p role="status" className="rounded-panel border border-line bg-panel p-4 text-heading">{notice}</p> : null}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Globe aria-hidden="true" className="text-violet" size={22} />
            Langue de l'interface
          </h2>
          <p className="mt-1 text-muted">L'administration est en français.</p>
          <label className="mt-4 grid gap-1">
            <span className="sr-only">Langue</span>
            <select className={fieldClass} value="fr" aria-label="Langue de l'interface">
              <option value="fr">Français</option>
            </select>
          </label>
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="text-section text-heading">Thème</h2>
          <p className="mt-1 text-muted">Le violet clair est le thème de la bibliothèque.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {THEMES.map((theme) => {
              const Icon = theme.icon
              const selected = form.theme === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={selected}
                  className={`grid min-h-24 place-items-center gap-1 rounded-control border font-semibold ${selected ? "border-violet bg-lavender text-violet" : "border-line bg-panel text-heading"}`}
                  onClick={() => set("theme", theme.id)}
                >
                  <Icon aria-hidden="true" size={22} />
                  {theme.label}
                  {selected ? <Check aria-hidden="true" size={16} /> : <span className="h-4" />}
                </button>
              )
            })}
          </div>
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Layers aria-hidden="true" className="text-violet" size={22} />
            Affichage
          </h2>
          <p className="mt-1 text-muted">Ces choix restent sur cet écran.</p>
          <div className="mt-2 divide-y divide-line">
            <Row icon={Layers} title="Mode compact" text="Resserrer les listes et les tableaux.">
              <PreferenceSwitch checked={form.compact} label="Mode compact" onChange={(value) => set("compact", value)} />
            </Row>
            <Row icon={Image} title="Afficher les vignettes" text="Montrer les images des livres, publications et annonces.">
              <PreferenceSwitch checked={form.covers} label="Afficher les vignettes" onChange={(value) => set("covers", value)} />
            </Row>
            <Row icon={Sparkles} title="Animations de l'interface" text="Activer les transitions visuelles.">
              <PreferenceSwitch checked={form.motion} label="Animations de l'interface" onChange={(value) => set("motion", value)} />
            </Row>
          </div>
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <CalendarDays aria-hidden="true" className="text-violet" size={22} />
            Formats de date et d'heure
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Format de date</span>
              <select className={fieldClass} value={form.dateFormat} onChange={(event) => set("dateFormat", event.target.value)}>
                <option value="long">31 déc. 2026</option>
                <option value="short">31/12/2026</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Format d'heure</span>
              <select className={fieldClass} value={form.timeFormat} onChange={(event) => set("timeFormat", event.target.value)}>
                <option value="24">24 heures (14:30)</option>
                <option value="12">12 heures (02:30 PM)</option>
              </select>
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="flex items-center gap-2 font-semibold text-heading">
                <Type aria-hidden="true" className="text-violet" size={18} />
                Éléments par page
              </span>
              <select className={fieldClass} value={form.pageSize} onChange={(event) => set("pageSize", event.target.value)}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>
        </article>
      </div>
      <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <Bell aria-hidden="true" className="text-violet" size={22} />
          Notifications
        </h2>
        <p className="mt-1 text-muted">Choisissez les alertes affichées dans l'administration. Aucun message n'est envoyé par courriel.</p>
        <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
          <Row icon={Layers} title="Nouveaux livres ajoutés" text="Lorsqu'un livre est ajouté au catalogue.">
            <PreferenceSwitch checked={form.books} label="Nouveaux livres ajoutés" onChange={(value) => set("books", value)} />
          </Row>
          <Row icon={Layers} title="Nouvelles publications" text="Lorsqu'une publication est mise en ligne.">
            <PreferenceSwitch checked={form.publications} label="Nouvelles publications" onChange={(value) => set("publications", value)} />
          </Row>
          <Row icon={CalendarDays} title="Nouveaux événements" text="Lors de la création d'un événement.">
            <PreferenceSwitch checked={form.events} label="Nouveaux événements" onChange={(value) => set("events", value)} />
          </Row>
          <Row icon={Bell} title="Nouvelles annonces" text="Pour les annonces importantes.">
            <PreferenceSwitch checked={form.announcements} label="Nouvelles annonces" onChange={(value) => set("announcements", value)} />
          </Row>
          <Row icon={Layers} title="Activités des utilisateurs" text="Ajouts et modifications de comptes.">
            <PreferenceSwitch checked={form.people} label="Activités des utilisateurs" onChange={(value) => set("people", value)} />
          </Row>
          <Row icon={Bell} title="Résumé quotidien" text="Un rappel dans l'administration, sans envoi extérieur.">
            <PreferenceSwitch checked={form.digest} label="Résumé quotidien" onChange={(value) => set("digest", value)} />
          </Row>
        </div>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading" onClick={reset}>
          <RotateCcw aria-hidden="true" size={18} />
          Réinitialiser
        </button>
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary">
          <Check aria-hidden="true" size={18} />
          Enregistrer les préférences
        </button>
      </div>
    </form>
  )
}
