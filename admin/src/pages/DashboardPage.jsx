import {
  BookOpen,
  CalendarDays,
  FileText,
  Layers,
  Library,
  Megaphone,
} from "lucide-react"
import { Link } from "react-router"
import { useSession } from "../session/SessionContext.jsx"

const FIGURES = [
  { label: "Livres", value: "12 846", icon: BookOpen, chip: "bg-lavender text-violet" },
  { label: "Exemplaires disponibles", value: "11 420", icon: Layers, chip: "bg-available-soft text-available" },
  { label: "Exemplaires indisponibles", value: "1 376", icon: Library, chip: "bg-unavailable-soft text-unavailable" },
  { label: "Annonces publiées", value: "48", icon: Megaphone, chip: "bg-lavender text-violet" },
  { label: "Événements à venir", value: "12", icon: CalendarDays, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
  { label: "Contenus en brouillon", value: "26", icon: FileText, chip: "bg-[#fde7c7] text-[#9a3412]" },
]

const COPIES = [
  { label: "Disponible", value: "11 420", share: "89,2 %", count: 11420, color: "#e4ae24" },
  { label: "Emprunté", value: "682", share: "5,3 %", count: 682, color: "#4e154f" },
  { label: "Réservé", value: "143", share: "1,1 %", count: 143, color: "#2563eb" },
  { label: "En réparation", value: "96", share: "0,8 %", count: 96, color: "#f59e0b" },
  { label: "Perdu", value: "55", share: "0,4 %", count: 55, color: "#e11d48" },
]

const STATUSES = [
  { label: "Annonces", published: 48, draft: 6 },
  { label: "Publications", published: 36, draft: 14 },
  { label: "Événements", published: 12, draft: 6 },
]

const ACTIVITY = [
  ["Jacques Mbuyi", "Publication", "Publication créée : « La lecture à l'ère numérique »", "Aujourd'hui 10:24"],
  ["Emma Ngalula", "Événement", "Événement mis à jour : « Atelier d'écriture »", "Aujourd'hui 09:47"],
  ["Martin Kabasele", "Livre", "Nouveau livre ajouté : « Intelligence artificielle »", "Hier 16:20"],
  ["Jacques Mbuyi", "Annonce", "Annonce publiée : « Nouveaux horaires »", "Hier 14:08"],
  ["Emma Ngalula", "Livre", "Exemplaire ajouté : cote TOT-IA-002", "Hier 11:36"],
]

const ACTIONS = [
  { label: "Ajouter un livre", to: "/catalogue/livres", icon: BookOpen },
  { label: "Nouvelle annonce", to: "/annonces", icon: Megaphone },
  { label: "Nouvelle publication", to: "/publications", icon: FileText },
  { label: "Nouvel événement", to: "/evenements/nouveau", icon: CalendarDays },
]

const COPY_TOTAL = COPIES.reduce((sum, item) => sum + item.count, 0)
const RING = 2 * Math.PI * 42

function rings() {
  let cursor = 0
  return COPIES.map((item) => {
    const length = (item.count / COPY_TOTAL) * RING
    const segment = { ...item, length, cursor }
    cursor += length
    return segment
  })
}

export function DashboardPage() {
  const session = useSession()
  const name = session.account?.name || ""
  const widest = Math.max(...STATUSES.map((item) => item.published + item.draft))

  return (
    <section className="grid gap-4">
      <article className="overflow-hidden rounded-panel bg-white shadow-card lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="p-6">
          <h2 className="text-section text-violet">Bonjour, {name}</h2>
          <p className="mt-3 max-w-xl">
            Bienvenue dans l'espace d'administration de la Bibliothèque Totanga.
            Gérez le catalogue, les annonces, les publications, les événements et les paramètres de la bibliothèque.
          </p>
        </div>
        <img
          src="/images/bibliotheque.webp"
          alt=""
          className="h-44 w-full object-cover lg:h-full"
        />
      </article>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {FIGURES.map((figure) => {
          const Icon = figure.icon
          return (
            <article key={figure.label} className="rounded-panel border border-line bg-white p-4 shadow-card">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${figure.chip}`}>
                <Icon aria-hidden="true" size={22} />
              </span>
              <p className="mt-3 text-section text-heading">{figure.value}</p>
              <p className="text-muted">{figure.label}</p>
            </article>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="text-section text-heading">Répartition des exemplaires</h2>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                {rings().map((item) => (
                  <circle
                    key={item.label}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="16"
                    strokeDasharray={`${item.length} ${RING - item.length}`}
                    strokeDashoffset={-item.cursor}
                  />
                ))}
              </svg>
              <p className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <span className="block text-section text-heading">12 796</span>
                  <span className="text-muted">Exemplaires</span>
                </span>
              </p>
            </div>
            <ul className="grid min-w-60 flex-1 gap-2">
              {COPIES.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="flex-1">{item.label}</span>
                  <span className="font-semibold text-heading">{item.value}</span>
                  <span className="w-16 text-right text-muted">({item.share})</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="text-section text-heading">Contenus par statut</h2>
          <ul className="mt-5 grid gap-4">
            {STATUSES.map((item) => (
              <li key={item.label}>
                <div className="mb-2 flex justify-between">
                  <span className="font-semibold text-heading">{item.label}</span>
                  <span className="text-muted">{item.published} publié · {item.draft} brouillon</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-[#f3eef8]">
                  <span className="bg-violet" style={{ width: `${(item.published / widest) * 100}%` }} />
                  <span className="bg-[#ddd4ea]" style={{ width: `${(item.draft / widest) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex gap-4 text-muted">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-violet" /> Publié</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#ddd4ea]" /> Brouillon</span>
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.8fr)]">
        <article className="rounded-panel border border-line bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-section text-heading">Activité récente</h2>
            <p className="font-semibold text-violet">Voir le journal des actions →</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="text-muted">
                  <th className="py-2 pr-3 font-semibold">Utilisateur</th>
                  <th className="py-2 pr-3 font-semibold">Action</th>
                  <th className="py-2 pr-3 font-semibold">Détails</th>
                  <th className="py-2 font-semibold">Date et heure</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY.map((row) => (
                  <tr key={row[2]} className="border-t border-line">
                    <td className="py-3 pr-3 font-semibold text-heading">{row[0]}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-lavender px-3 py-1 font-semibold text-violet">{row[1]}</span>
                    </td>
                    <td className="py-3 pr-3">{row[2]}</td>
                    <td className="py-3 text-muted">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="text-section text-heading">Accès rapides</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="grid min-h-28 place-items-center rounded-panel border border-line px-3 py-4 text-center font-semibold text-violet"
                >
                  <Icon aria-hidden="true" size={28} />
                  {action.label}
                </Link>
              )
            })}
          </div>
        </article>
      </div>
    </section>
  )
}
