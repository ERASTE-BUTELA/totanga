export function AnnouncementsHero({ titleTag = "h1" }) {
  const Title = titleTag
  return (
    <header className="relative overflow-hidden bg-violet text-on-primary">
      <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-violet/85" aria-hidden="true" />
      <div className="relative px-4 py-10 sm:px-8 lg:px-14">
        <Title className="text-page">Annonces</Title>
        <p className="mt-3 max-w-3xl text-lead">Toutes les informations importantes de la Bibliothèque Totanga.</p>
        <span className="mt-4 block h-1 w-16 rounded-full bg-gold-bright" aria-hidden="true" />
      </div>
    </header>
  )
}
