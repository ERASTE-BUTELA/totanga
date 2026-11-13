export function Panel({ labelledBy, className = "", children }) {
  return (
    <section aria-labelledby={labelledBy} className={`rounded-panel bg-panel p-6 shadow-panel ${className}`}>
      {children}
    </section>
  )
}
