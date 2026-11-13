import { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CalendarRange,
  Eye,
  Globe2,
  MonitorSmartphone,
  Search,
  Share2,
  Users,
} from "lucide-react"
import { getSiteStatistics } from "../api/content.js"

const numberFormat = new Intl.NumberFormat("fr-FR")

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

function TrafficChart({ series }) {
  const width = 640
  const height = 220
  const pad = 24
  const max = Math.max(1, ...series.map((row) => Math.max(row.visits, row.unique_visitors)))
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0

  function points(key) {
    return series
      .map((row, index) => {
        const x = pad + index * step
        const y = height - pad - ((row[key] || 0) / max) * (height - pad * 2)
        return `${x},${y}`
      })
      .join(" ")
  }

  if (!series.length) {
    return <p className="mt-4 text-muted">Aucune donnée sur cette période.</p>
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full min-w-[28rem]" role="img" aria-label="Graphique des visites">
        <polyline fill="none" stroke="#4e154f" strokeWidth="3" points={points("visits")} />
        <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6 4" points={points("unique_visitors")} />
        {series.map((row, index) => {
          const x = pad + index * step
          return (
            <g key={row.day}>
              <circle cx={x} cy={height - pad - ((row.visits || 0) / max) * (height - pad * 2)} r="3.5" fill="#4e154f" />
              <circle cx={x} cy={height - pad - ((row.unique_visitors || 0) / max) * (height - pad * 2)} r="3.5" fill="#2563eb" />
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-meta text-muted">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-violet" /> Visites</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-[#2563eb]" /> Visiteurs uniques</span>
      </div>
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

  const figures = useMemo(() => {
    const totals = data?.totals || {}
    return [
      { label: "Visites aujourd'hui", value: formatCount(totals.today?.visits), icon: Eye, chip: "bg-lavender text-violet" },
      { label: "Visiteurs aujourd'hui", value: formatCount(totals.today?.unique_visitors), icon: Users, chip: "bg-available-soft text-available" },
      { label: "Visites (7 jours)", value: formatCount(totals.week?.visits), icon: CalendarRange, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
      { label: "Visiteurs (7 jours)", value: formatCount(totals.week?.unique_visitors), icon: Users, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
      { label: "Visites (30 jours)", value: formatCount(totals.month?.visits), icon: CalendarRange, chip: "bg-[#fde7c7] text-[#9a3412]" },
      { label: "Visiteurs (30 jours)", value: formatCount(totals.month?.unique_visitors), icon: Users, chip: "bg-[#fde7c7] text-[#9a3412]" },
    ]
  }, [data])

  function preset(days) {
    setFrom(isoDay(shiftDays(today, -(days - 1))))
    setTo(isoDay(today))
  }

  return (
    <section className="grid gap-4">
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="text-section text-heading">Période</h2>
        <p className="mt-1 text-muted">
          Mesure anonyme de la fréquentation du site public. Aucune adresse IP n’est stockée.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-meta font-semibold text-muted">Du</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-control border border-line bg-white px-3" />
          </label>
          <label className="grid gap-1">
            <span className="text-meta font-semibold text-muted">Au</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-control border border-line bg-white px-3" />
          </label>
          <button type="button" className="min-h-11 rounded-control border border-line bg-white px-4 font-semibold" onClick={() => preset(7)}>7 jours</button>
          <button type="button" className="min-h-11 rounded-control border border-line bg-white px-4 font-semibold" onClick={() => preset(30)}>30 jours</button>
          <button type="button" className="min-h-11 rounded-control border border-line bg-white px-4 font-semibold" onClick={() => preset(90)}>90 jours</button>
        </div>
      </article>

      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {(loading ? Array.from({ length: 6 }, (_, index) => ({ label: "…", value: "…", icon: Eye, chip: "bg-lavender text-violet", key: index })) : figures).map((figure) => {
          const Icon = figure.icon
          return (
            <article key={figure.label + (figure.key ?? "")} className="rounded-panel border border-line bg-white p-4 shadow-card">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${figure.chip}`}>
                <Icon aria-hidden="true" size={22} />
              </span>
              <p className="mt-3 text-section text-heading">{figure.value}</p>
              <p className="text-muted">{figure.label}</p>
            </article>
          )
        })}
      </div>

      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="text-section text-heading">Visites et visiteurs uniques</h2>
        <p className="mt-1 text-muted">
          Période du {data?.from || from} au {data?.to || to}
          {data?.totals ? ` · ${formatCount(data.totals.period_visits)} visites · ${formatCount(data.totals.period_unique_visitors)} visiteurs` : ""}
        </p>
        {loading ? <p className="mt-4 text-muted">Chargement…</p> : <TrafficChart series={Array.isArray(data?.series) ? data.series : []} />}
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Eye aria-hidden="true" size={22} className="text-violet" /> Pages les plus vues</h2>
          <RankList
            empty="Aucune page enregistrée sur cette période."
            rows={(data?.top_pages || []).map((row) => ({ key: row.path, label: row.label, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><BookOpen aria-hidden="true" size={22} className="text-violet" /> Livres les plus consultés</h2>
          <RankList
            empty="Aucun livre consulté sur cette période."
            rows={(data?.top_books || []).map((row) => ({ key: String(row.id), label: row.label, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Globe2 aria-hidden="true" size={22} className="text-violet" /> Catégories populaires</h2>
          <RankList
            empty="Aucune catégorie mise en avant."
            rows={(data?.top_categories || []).map((row) => ({ key: String(row.id), label: row.label, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Search aria-hidden="true" size={22} className="text-violet" /> Recherches fréquentes</h2>
          <RankList
            empty="Aucune recherche agrégée."
            rows={(data?.top_searches || []).map((row) => ({ key: row.term, label: row.term, hits: row.hits }))}
          />
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><MonitorSmartphone aria-hidden="true" size={22} className="text-violet" /> Appareils</h2>
          <ShareBars rows={data?.devices || []} />
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading"><Share2 aria-hidden="true" size={22} className="text-violet" /> Origine</h2>
          <ShareBars rows={data?.origins || []} />
        </article>
      </div>

      {data?.geo_note ? (
        <p className="rounded-panel border border-line bg-white p-4 text-muted">{data.geo_note}</p>
      ) : null}
    </section>
  )
}
