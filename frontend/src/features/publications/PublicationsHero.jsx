export function PublicationsHero({ titleTag = "h1" }) {
  const Title = titleTag
  return (
    <header className="page-hero relative overflow-hidden bg-brand text-on-brand">
      <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" data-theme-keep="" />
      <div className="absolute inset-0 bg-brand/85" aria-hidden="true" />
      <div className="relative px-4 py-10 sm:px-8 lg:px-14">
        <Title className="text-page">Publications</Title>
        <p className="mt-3 max-w-3xl text-lead">Articles, analyses et recommandations de lecture.</p>
        <span className="mt-4 block h-1 w-16 rounded-full bg-brand-accent" aria-hidden="true" />
      </div>
    </header>
  )
}
