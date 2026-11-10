export function QueryState({ status, error, children }) {
  if (status === "loading") return <p className="text-muted">Chargement…</p>
  if (status === "error") {
    return (
      <p className="text-muted" role="alert">
        {error}
      </p>
    )
  }
  return children
}
