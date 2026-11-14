export function Panel({ labelledBy, className = "", children }) {
  return (
    <section aria-labelledby={labelledBy} className={`rounded-panel bg-panel p-4 shadow-panel sm:p-6 ${className}`}>
      {children}
    </section>
  )
}
