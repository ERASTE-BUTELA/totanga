import { useEffect } from "react"
import { CONTRAST_PAIRS, THEME_TOKENS, tokenMap } from "../lib/themeTokens.js"
import { contrastRatio, formatRatio } from "../lib/contrast.js"

function ContrastTable({ mode }) {
  const map = tokenMap(mode)
  return (
    <table className="w-full border-collapse text-meta">
      <thead>
        <tr className="border-b border-line text-left text-muted">
          <th className="py-2 pr-2 font-semibold">Paire</th>
          <th className="py-2 pr-2 font-semibold">Ratio</th>
          <th className="py-2 font-semibold">Seuil</th>
        </tr>
      </thead>
      <tbody>
        {CONTRAST_PAIRS.filter((pair) => !pair.modes || pair.modes.includes(mode)).map((pair) => {
          const ratio = contrastRatio(map[pair.fg], map[pair.bg])
          const ok = ratio >= pair.min
          return (
            <tr key={pair.label} className="border-b border-line">
              <td className="py-2 pr-2 text-ink">{pair.label}</td>
              <td className={`py-2 pr-2 font-semibold ${ok ? "text-available" : "text-unavailable"}`}>
                {formatRatio(ratio)}
              </td>
              <td className="py-2 text-muted">≥ {pair.min}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ThemeColumn({ mode, label }) {
  return (
    <div
      className="theme-demo flex min-w-0 flex-col gap-5 rounded-panel border border-line bg-canvas p-4 text-ink shadow-panel sm:p-5"
      data-theme={mode}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
        <h2 className="text-section text-heading">{label}</h2>
        <span className="text-meta text-muted">{mode}</span>
      </header>

      <section className="grid gap-2">
        <h3 className="text-cover text-heading">Surfaces</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["canvas", "Fond"],
            ["panel", "Panneau"],
            ["panel-soft", "Doux"],
            ["lavender", "Lavande"],
          ].map(([id, name]) => (
            <div key={id} className="overflow-hidden rounded-control border border-line">
              <div className="h-12" style={{ background: `var(--color-${id})` }} />
              <p className="bg-panel px-2 py-1 text-meta text-muted">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-panel border border-line bg-panel p-4 shadow-card">
        <h3 className="text-cover text-heading">Carte et texte</h3>
        <p className="mt-2 text-body text-ink">Texte principal sur panneau — blanc cassé en sombre, jamais blanc pur.</p>
        <p className="mt-1 text-meta text-muted">Texte secondaire pour métadonnées et aides.</p>
        <p className="mt-2 text-meta font-semibold text-gold">Accent doré pour les mises en avant.</p>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Boutons</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-violet px-4 font-semibold text-on-primary">
            Primaire
          </button>
          <button type="button" className="inline-flex min-h-11 items-center rounded-control border border-line bg-panel px-4 font-semibold text-violet">
            Secondaire
          </button>
          <button type="button" className="inline-flex min-h-11 items-center rounded-control border border-line bg-panel px-4 font-semibold text-heading">
            Neutre
          </button>
          <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-unavailable px-4 font-semibold text-on-primary">
            Danger
          </button>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Champs</h3>
        <label className="grid gap-1 text-meta text-muted">
          Libellé
          <input type="text" defaultValue="Exemple de saisie" className="w-full rounded-control border border-line bg-panel px-3 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet" />
        </label>
        <label className="grid gap-1 text-meta text-muted">
          Liste
          <select className="w-full rounded-control border border-line bg-panel px-3 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet" defaultValue="b">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </select>
        </label>
        <label className="grid gap-1 text-meta text-muted">
          Zone de texte
          <textarea rows={3} defaultValue="Contenu éditable" className="w-full rounded-control border border-line bg-panel px-3 py-2 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet" />
        </label>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Pastilles de statut</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-available-soft px-3 py-1 text-badge font-semibold text-available">Disponible</span>
          <span className="rounded-full bg-unavailable-soft px-3 py-1 text-badge font-semibold text-unavailable">Indisponible</span>
          <span className="rounded-full bg-info-soft px-3 py-1 text-badge font-semibold text-info">Emprunté</span>
          <span className="rounded-full bg-warning-soft px-3 py-1 text-badge font-semibold text-warning">Réservé</span>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Alertes</h3>
        <p className="rounded-control border border-line bg-available-soft px-3 py-2 text-meta text-available" role="status">Enregistrement réussi.</p>
        <p className="rounded-control border border-line bg-unavailable-soft px-3 py-2 text-meta text-unavailable" role="alert">Impossible d’enregistrer. Vérifiez les champs.</p>
        <p className="rounded-control border border-line bg-info-soft px-3 py-2 text-meta text-info">Information : synchronisation en cours.</p>
        <p className="rounded-control border border-line bg-warning-soft px-3 py-2 text-meta text-warning">Attention : brouillon non publié.</p>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Tableau</h3>
        <div className="overflow-x-auto rounded-control border border-line bg-panel">
          <table className="w-full border-collapse text-meta">
            <thead className="bg-panel-soft text-left text-muted">
              <tr>
                <th className="border-b border-line px-3 py-2 font-semibold">Titre</th>
                <th className="border-b border-line px-3 py-2 font-semibold">État</th>
                <th className="border-b border-line px-3 py-2 font-semibold">Exemplaires</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              <tr>
                <td className="border-b border-line px-3 py-2">Les Contes de la savane</td>
                <td className="border-b border-line px-3 py-2"><span className="rounded-full bg-available-soft px-2 py-0.5 text-available">Publié</span></td>
                <td className="border-b border-line px-3 py-2">4</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Histoire du Mali</td>
                <td className="px-3 py-2"><span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning">Brouillon</span></td>
                <td className="px-3 py-2">1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Menu</h3>
        <div className="w-full max-w-xs overflow-hidden rounded-control border border-line bg-panel shadow-card">
          <button type="button" className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left text-body text-ink hover:bg-panel-soft">Mon profil</button>
          <button type="button" className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left text-body text-ink hover:bg-panel-soft">Préférences</button>
          <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-body text-unavailable hover:bg-panel-soft">Se déconnecter</button>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Fenêtre</h3>
        <div className="rounded-panel border border-line bg-panel p-4 shadow-panel">
          <h4 className="text-card text-heading">Confirmer la suppression</h4>
          <p className="mt-2 text-meta text-muted">Cette action est définitive. L’élément ne pourra pas être récupéré.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-11 items-center rounded-control border border-line bg-panel px-4 font-semibold text-heading">Annuler</button>
            <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-unavailable px-4 font-semibold text-on-primary">Supprimer</button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Graphique (statistiques)</h3>
        <div className="rounded-panel border border-line bg-panel p-4 shadow-card">
          <p className="text-meta text-muted">Répartition des exemplaires</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-panel-soft">
            <span className="bg-violet" style={{ width: "42%" }} />
            <span className="bg-info" style={{ width: "28%" }} />
            <span className="bg-gold-bright" style={{ width: "18%" }} />
            <span className="bg-unavailable" style={{ width: "12%" }} />
          </div>
          <ul className="mt-3 grid gap-1 text-meta text-ink">
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-violet" /> Disponible 42 %</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-info" /> Emprunté 28 %</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-gold-bright" /> Réservé 18 %</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-unavailable" /> Perdu 12 %</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Éditeur de texte</h3>
        <div className="overflow-hidden rounded-control border border-line bg-panel">
          <div className="flex flex-wrap gap-1 border-b border-line bg-panel-soft p-2">
            {["B", "I", "U", "Lien"].map((item) => (
              <button key={item} type="button" className="inline-flex h-9 min-w-9 items-center justify-center rounded-control border border-line bg-panel px-2 text-meta font-semibold text-ink">
                {item}
              </button>
            ))}
          </div>
          <div className="min-h-24 px-3 py-2 text-body text-ink">
            <p>Paragraphe d’exemple dans l’éditeur.</p>
            <p className="text-muted">Texte secondaire et <span className="text-violet underline">lien</span>.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-cover text-heading">Contraste WCAG</h3>
        <ContrastTable mode={mode} />
      </section>
    </div>
  )
}

export default function ThemeDemoPage() {
  useEffect(() => {
    document.title = "Démo thème (dev) — Totanga"
  }, [])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 max-w-3xl">
        <p className="text-meta font-semibold text-gold">Développement uniquement</p>
        <h1 className="mt-1 text-page text-heading">Palette et composants — mode clair / sombre</h1>
        <p className="mt-2 text-lead text-muted">
          Page absente de la production. Vérifiez les surfaces, pastilles, champs, tableaux et ratios de contraste avant application globale.
        </p>
      </header>

      <section className="mb-8 overflow-x-auto rounded-panel border border-line bg-panel p-4 shadow-card">
        <h2 className="text-section text-heading">Jetons sémantiques</h2>
        <table className="mt-3 w-full min-w-[40rem] border-collapse text-meta">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 pr-2 font-semibold">Jeton</th>
              <th className="py-2 pr-2 font-semibold">Rôle</th>
              <th className="py-2 pr-2 font-semibold">Clair</th>
              <th className="py-2 font-semibold">Sombre</th>
            </tr>
          </thead>
          <tbody>
            {THEME_TOKENS.map((token) => (
              <tr key={token.id} className="border-b border-line">
                <td className="py-2 pr-2 font-semibold text-ink">{token.id}</td>
                <td className="py-2 pr-2 text-muted">{token.label}</td>
                <td className="py-2 pr-2">
                  <span className="inline-flex items-center gap-2 text-ink">
                    <span className="h-4 w-4 rounded border border-line" style={{ background: token.light }} />
                    {token.light}
                  </span>
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-2 text-ink">
                    <span className="h-4 w-4 rounded border border-line" style={{ background: token.dark }} />
                    {token.dark}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ThemeColumn mode="light" label="Clair" />
        <ThemeColumn mode="dark" label="Sombre" />
      </div>
    </main>
  )
}
