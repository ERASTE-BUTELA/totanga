export function BookMark({ className = "" }) {
  return (
    <svg viewBox="0 0 76 48" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M38 12c-8.5-4.2-18.2-5.2-30-2.2v26c11.2-2.6 21-1.4 30 3.2V12z" />
      <path fill="currentColor" d="M38 12c8.5-4.2 18.2-5.2 30-2.2v26c-11.2-2.6-21-1.4-30 3.2V12z" />
      <path fill="#fff" fillOpacity="0.35" d="M38 13.2v24.6" />
    </svg>
  )
}

export function BrandMark({ tone = "violet", stacked = false }) {
  const title = tone === "white" ? "text-on-bar" : "text-violet"
  const place = tone === "white" ? "text-on-bar/80" : "text-muted"
  const book = tone === "white" ? "text-gold-bright" : "text-violet"
  return (
    <div className={stacked ? "flex flex-col items-center text-center" : "flex items-center gap-3"}>
      <BookMark className={`h-12 w-16 ${book}`} />
      <div>
        <p className={`text-card leading-tight font-extrabold ${title}`}>Bibliothèque Totanga</p>
        <p className={place}>Kinshasa, RDC</p>
      </div>
    </div>
  )
}
