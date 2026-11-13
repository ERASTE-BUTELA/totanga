export function PageHero({ title, subtitle }) {
  return (
    <header className="rounded-card bg-violet px-6 py-8 text-on-primary">
      <h1 className="text-page">{title}</h1>
      {subtitle ? <p className="mt-3 max-w-2xl text-lead">{subtitle}</p> : null}
      <span className="mt-4 block h-1 w-16 rounded-full bg-gold-bright" aria-hidden="true" />
    </header>
  )
}
