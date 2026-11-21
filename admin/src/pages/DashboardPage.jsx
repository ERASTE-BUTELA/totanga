import { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CalendarDays,
  FileText,
  Layers,
  Library,
  Megaphone,
} from "lucide-react"
import { Link } from "react-router"
import { getDashboard } from "../api/dashboard.js"
import { useSession } from "../session/SessionContext.jsx"

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`

const COPY_COLORS = {
  available: "#e4ae24",
  borrowed: "#4e154f",
  reserved: "#2563eb",
  in_repair: "#f59e0b",
  lost: "#e11d48",
}

const ACTIONS = [
  { label: "Ajouter un livre", to: "/catalogue/livres", icon: BookOpen },
  { label: "Nouvelle annonce", to: "/annonces", icon: Megaphone },
  { label: "Nouvelle publication", to: "/publications", icon: FileText },
  { label: "Nouvel événement", to: "/evenements/nouveau", icon: CalendarDays },
]

const RING = 2 * Math.PI * 42
const numberFormat = new Intl.NumberFormat("fr-FR")

function formatCount(value) {
  return numberFormat.format(Number(value) || 0)
}

function formatWhen(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kinshasa",
  })
}

function actionKind(action, targetType) {
  const text = `${action} ${targetType}`.toLowerCase()
  if (text.includes("annonce")) return "Annonce"
  if (text.includes("evenement") || text.includes("événement")) return "Événement"
  if (text.includes("livre") || text.includes("catalog.book") || text.includes("exemplaire")) return "Livre"
  if (text.includes("publication") || text.includes("post")) return "Publication"
  if (text.includes("connexion")) return "Connexion"
  if (text.includes("compte") || text.includes("user")) return "Compte"
  return "Action"
}

function actionDetail(row) {
  const label = String(row.action || "").replaceAll("_", " ")
  const object = row.target_type ? `${row.target_type}${row.target_id ? ` #${row.target_id}` : ""}` : ""
  return object ? `${label} · ${object}` : label
}

function rings(copies) {
  const total = copies.reduce((sum, item) => sum + item.count, 0) || 1
  let cursor = 0
  return copies.map((item) => {
    const length = (item.count / total) * RING
    const segment = { ...item, length, cursor }
    cursor += length
    return segment
  })
}

export function DashboardPage() {
  const session = useSession()
  const name = session.account?.name || ""
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getDashboard().then((result) => {
      if (!active) return
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }
      setData(result.data)
      setError("")
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const figures = useMemo(() => {
    if (!data) return []
    return [
      { label: "Livres", value: formatCount(data.books), icon: BookOpen, chip: "bg-lavender text-violet" },
      { label: "Exemplaires disponibles", value: formatCount(data.copies_available), icon: Layers, chip: "bg-available-soft text-available" },
      { label: "Exemplaires indisponibles", value: formatCount(data.copies_unavailable), icon: Library, chip: "bg-unavailable-soft text-unavailable" },
      { label: "Annonces publiées", value: formatCount(data.announcements_published), icon: Megaphone, chip: "bg-lavender text-violet" },
      { label: "Événements à venir", value: formatCount(data.events_upcoming), icon: CalendarDays, chip: "bg-info-soft text-info" },
      { label: "Contenus en brouillon", value: formatCount(data.drafts), icon: FileText, chip: "bg-warning-soft text-warning" },
    ]
  }, [data])

  const copies = useMemo(() => {
    const rows = Array.isArray(data?.copies) ? data.copies : []
    const total = rows.reduce((sum, item) => sum + (Number(item.count) || 0), 0) || 1
    return rows.map((item) => {
      const count = Number(item.count) || 0
      const share = `${((count / total) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`
      return {
        label: item.label,
        count,
        value: formatCount(count),
        share,
        color: COPY_COLORS[item.code] || "#4e154f",
      }
    })
  }, [data])

  const statuses = Array.isArray(data?.statuses) ? data.statuses : []
  const widest = Math.max(1, ...statuses.map((item) => (Number(item.published) || 0) + (Number(item.draft) || 0)))
  const activity = Array.isArray(data?.activity) ? data.activity : []
  const copiesTotal = copies.reduce((sum, item) => sum + item.count, 0)

  return (
    <section className="grid gap-4">
      <article className="overflow-hidden rounded-panel bg-panel shadow-card lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="p-4 sm:p-6">
          <h2 className="text-section text-violet">Bonjour, {name}</h2>
          <p className="mt-3 max-w-xl">
            Bienvenue dans l'espace d'administration de la Bibliothèque Totanga.
            Gérez le catalogue, les annonces, les publications, les événements et les paramètres de la bibliothèque.
          </p>
        </div>
        <img
          src={asset("images/bibliotheque.webp")}
          alt=""
          className="h-36 w-full object-cover sm:h-44 lg:h-full"
        />
      </article>

      {error ? (
        <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {(loading ? Array.from({ length: 6 }, (_, index) => ({ label: "…", value: "…", icon: BookOpen, chip: "bg-lavender text-violet", key: index })) : figures).map((figure) => {
          const Icon = figure.icon
          return (
            <article key={figure.label + (figure.key ?? "")} className="rounded-panel border border-line bg-panel p-4 shadow-card">
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
        <article className="rounded-panel border border-line bg-panel p-4 shadow-card sm:p-6">
          <h2 className="text-section text-heading">Répartition des exemplaires</h2>
          {loading ? (
            <p className="mt-5 text-muted">Chargement…</p>
          ) : copiesTotal === 0 ? (
            <p className="mt-5 text-muted">Aucun exemplaire pour le moment.</p>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-6">
              <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                  {rings(copies).map((item) => (
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
                    <span className="block text-section text-heading">{formatCount(copiesTotal)}</span>
                    <span className="text-muted">Exemplaires</span>
                  </span>
                </p>
              </div>
              <ul className="grid min-w-0 flex-1 basis-full gap-2 sm:min-w-60 sm:basis-auto">
                {copies.map((item) => (
                  <li key={item.label} className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <span className="font-semibold text-heading">{item.value}</span>
                    <span className="w-14 shrink-0 text-right text-muted sm:w-16">({item.share})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="rounded-panel border border-line bg-panel p-4 shadow-card sm:p-6">
          <h2 className="text-section text-heading">Contenus par statut</h2>
          {loading ? (
            <p className="mt-5 text-muted">Chargement…</p>
          ) : (
            <>
              <ul className="mt-5 grid gap-4">
                {statuses.map((item) => (
                  <li key={item.label}>
                    <div className="mb-2 flex justify-between">
                      <span className="font-semibold text-heading">{item.label}</span>
                      <span className="text-muted">
                        {item.published} publié · {item.draft} brouillon
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-lavender">
                      <span className="bg-violet" style={{ width: `${((Number(item.published) || 0) / widest) * 100}%` }} />
                      <span className="bg-line" style={{ width: `${((Number(item.draft) || 0) / widest) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex gap-4 text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-violet" /> Publié
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-line" /> Brouillon
                </span>
              </p>
            </>
          )}
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.8fr)]">
        <article className="rounded-panel border border-line bg-panel p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-section text-heading">Activité récente</h2>
            <Link to="/journal" className="font-semibold text-violet">
              Voir le journal des actions →
            </Link>
          </div>
          {loading ? (
            <p className="mt-4 text-muted">Chargement…</p>
          ) : activity.length === 0 ? (
            <p className="mt-4 text-muted">Aucune action récente.</p>
          ) : (
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
                  {activity.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="py-3 pr-3 font-semibold text-heading">{row.actor}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-lavender px-3 py-1 font-semibold text-violet">
                          {actionKind(row.action, row.target_type)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{actionDetail(row)}</td>
                      <td className="py-3 text-muted">{formatWhen(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-panel border border-line bg-panel p-6 shadow-card">
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
