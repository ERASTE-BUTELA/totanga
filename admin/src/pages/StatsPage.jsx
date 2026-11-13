import { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CalendarRange,
  Eye,
  FileText,
  Globe2,
  Info,
  MonitorSmartphone,
  Search,
  Share2,
  Users,
} from "lucide-react"
import { getSiteStatistics } from "../api/content.js"

const numberFormat = new Intl.NumberFormat("fr-FR")

const METRICS = [
  { id: "visitors", label: "Visiteurs", color: "var(--color-violet)" },
  { id: "visits", label: "Visites", color: "var(--color-info)" },
  { id: "page_views", label: "Pages vues", color: "var(--color-warning)" },
]

const DEFAULT_DEFINITIONS = {
  visitors: "Empreinte quotidienne distincte, comptée une fois par jour.",
  visits: "Séjour continu ; une nouvelle visite après 30 minutes sans activité, ou le lendemain.",
  page_views: "Chaque page ouverte (changements de page inclus), hors rechargements instantanés et robots.",
}

function formatCount(value) {
  return numberFormat.format(Number(value) || 0)
}

function isoDay(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shiftDays(base, days) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function Tip({ text }) {
  return (
    <span className="group relative inline-flex">
      <Info aria-hidden="true" size={14} className="text-muted" />
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-control border border-line bg-panel p-2 text-left text-meta text-muted shadow-card group-hover:block group-focus-within:block">
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

function RankList({ empty, rows }) {
  if (!rows.length) return <p className="mt-4 text-muted">{empty}</p>
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
          <span className="min-w-0 font-semibold text-heading">{row.label}</span>
          <span className="shrink-0 rounded-full bg-lavender px-3 py-1 text-body font-semibold text-violet">
            {formatCount(row.hits)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TrafficChart({ series, metric }) {
  const width = 640
  const height = 220
  const pad = 24
  const selected = METRICS.find((item) => item.id === metric) || METRICS[0]
  const max = Math.max(1, ...series.map((row) => Number(row[selected.id]) || 0))
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0
  const points = series
    .map((row, index) => {
      const x = pad + index * step
      const y = height - pad - ((Number(row[selected.id]) || 0) / max) * (height - pad * 2)
      return `${x},${y}`
    })
    .join(" ")

  if (!series.length) {
    return <p className="mt-4 text-muted">Aucune donnée sur cette période.</p>
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full min-w-[28rem]" role="img" aria-label={`Graphique des ${selected.label.toLowerCase()}`}>
        <polyline fill="none" stroke={selected.color} strokeWidth="3" points={points} />
        {series.map((row, index) => {
          const x = pad + index * step
          const y = height - pad - ((Number(row[selected.id]) || 0) / max) * (height - pad * 2)
          return <circle key={row.day} cx={x} cy={y} r="3.5" fill={selected.color} />
        })}
      </svg>
    </div>
  )
}

function ShareBars({ rows }) {
  const total = rows.reduce((sum, row) => sum + (Number(row.hits) || 0), 0) || 1
  if (!rows.length) return <p className="mt-4 text-muted">Pas encore de données.</p>
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((row) => {
        const pct = Math.round(((Number(row.hits) || 0) / total) * 100)
        return (
          <li key={row.id || row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-body">
              <span className="font-semibold text-heading">{row.label}</span>
              <span className="text-muted">{formatCount(row.hits)} · {pct} %</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function StatsPanel() {
  const today = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(() => isoDay(shiftDays(today, -29)))
  const [to, setTo] = useState(() => isoDay(today))
  const [metric, setMetric] = useState("visits")
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getSiteStatistics({ from, to }).then((result) => {
      if (!active) return
      if (!result.ok) {
        setError(result.error)
        setData(null)
        setLoading(false)
        return
      }
      setError("")
      setData(result.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [from, to])

  const definitions = data?.definitions || DEFAULT_DEFINITIONS
  const period = data?.totals?.period || {}

  const figures = useMemo(() => {
    const totals = data?.totals || {}
    const todayTotals = totals.today || {}
    return [
      { label: "Visiteurs aujourd'hui", value: formatCount(todayTotals.visitors), icon: Users, chip: "bg-available-soft text-available", tip: definitions.visitors },
      { label: "Visites aujourd'hui", value: formatCount(todayTotals.visits), icon: Eye, chip: "bg-lavender text-violet", tip: definitions.visits },
      { label: "Pages vues aujourd'hui", value: formatCount(todayTotals.page_views), icon: FileText, chip: "bg-info-soft text-info", tip: definitions.page_views },
      { label: "Pages / visite (aujourd'hui)", value: formatCount(todayTotals.pages_per_visit), icon: CalendarRange, chip: "bg-warning-soft text-warning", tip: "Moyenne des pages vues par visite aujourd'hui." },
      { label: "Visiteurs (7 jours)", value: formatCount(totals.week?.visitors), icon: Users, chip: "bg-available-soft text-available", tip: definitions.visitors },
      { label: "Visites (7 jours)", value: formatCount(totals.week?.visits), icon: Eye, chip: "bg-lavender text-violet", tip: definitions.visits },
    ]
  }, [data, definitions])

  function preset(days) {
    setFrom(isoDay(shiftDays(today, -(days - 1))))
    setTo(isoDay(today))
  }

  return (
    <section className="grid gap-4">
      <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
        <h2 className="text-section text-heading">Période</h2>
        <p className="mt-1 text-muted">
          Mesure anonyme de la fréquentation du site public. Aucune adresse IP n’est stockée.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-meta font-semibold text-muted">Du</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-control border border-line bg-panel px-3" />
          </label>
          <label className="grid gap-1">
            <span className="text-meta font-semibold text-muted">Au</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-control border border-line bg-panel px-3" />
          </label>
          <button type="button" className="min-h-11 rounded-control border border-line bg-panel px-4 font-semibold" onClick={() => preset(7)}>7 jours</button>
          <button type="button" className="min-h-11 rounded-control border border-line bg-panel px-4 font-semibold" onClick={() => preset(30)}>30 jours</button>
          <button type="button" className="min-h-11 rounded-control border border-line bg-panel px-4 font-semibold" onClick={() => preset(90)}>90 jours</button>
        </div>
      </article>

      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {(loading ? Array.from({ length: 6 }, (_, index) => ({ label: "…", value: "…", icon: Eye, chip: "bg-lavender text-violet", tip: "", key: index })) : figures).map((figure) => {
          const Icon = figure.icon
          return (
            <article key={figure.label + (figure.key ?? "")} className="rounded-panel border border-line bg-panel p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${figure.chip}`}>
                  <Icon aria-hidden="true" size={22} />
                </span>
                {figure.tip ? <Tip text={figure.tip} /> : null}
              </div>
              <p className="mt-3 text-section text-heading">{figure.value}</p>
              <p className="text-muted">{figure.label}</p>
            </article>
          )
        })}
      </div>

      <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-section text-heading">Évolution</h2>
            <p className="mt-1 text-muted">
              Période du {data?.from || from} au {data?.to || to}
              {period.visitors != null
                ? ` · ${formatCount(period.visitors)} visiteurs · ${formatCount(period.visits)} visites · ${formatCount(period.page_views)} pages vues · ${formatCount(period.pages_per_visit)} pages/visite`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={metric === item.id}
                className={`min-h-11 rounded-control px-4 font-semibold ${metric === item.id ? "bg-violet text-on-primary" : "border border-line bg-panel text-heading"}`}
                onClick={() => setMetric(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? <p className="mt-4 text-muted">Chargement…</p> : <TrafficChart series={Array.isArray(data?.series) ? data.series : []} metric={metric} />}
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Eye aria-hidden="true" size={22} className="text-violet" /> Pages les plus vues</h2>
          <RankList
            empty="Aucune page enregistrée sur cette période."
            rows={(data?.top_pages || []).map((row) => ({ key: row.path, label: row.label, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><BookOpen aria-hidden="true" size={22} className="text-violet" /> Livres les plus consultés</h2>
          <RankList
            empty="Aucun livre consulté sur cette période."
            rows={(data?.top_books || []).map((row) => ({ key: String(row.id), label: row.label, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Globe2 aria-hidden="true" size={22} className="text-violet" /> Catégories populaires</h2>
          <RankList
            empty="Aucune catégorie mise en avant."
            rows={(data?.top_categories || []).map((row) => ({ key: String(row.id), label: row.label, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Search aria-hidden="true" size={22} className="text-violet" /> Recherches fréquentes</h2>
          <RankList
            empty="Aucune recherche agrégée."
            rows={(data?.top_searches || []).map((row) => ({ key: row.term, label: row.term, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><MonitorSmartphone aria-hidden="true" size={22} className="text-violet" /> Appareils</h2>
          <ShareBars rows={data?.devices || []} />
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Share2 aria-hidden="true" size={22} className="text-violet" /> Origine</h2>
          <ShareBars rows={data?.origins || []} />
        </article>
      </div>

      {data?.geo_note ? (
        <p className="rounded-panel border border-line bg-panel p-4 text-muted">{data.geo_note}</p>
      ) : null}
    </section>
  )
}
