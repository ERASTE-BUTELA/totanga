import { useState } from "react"

export function CopyPageLink() {
  const [message, setMessage] = useState("")

  async function onClick() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Lien copié.")
    } catch {
      setMessage(url)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className="rounded-control border border-line px-4 py-2 font-semibold text-ink"
      >
        Copier le lien
      </button>
      {message ? <p className="mt-2 text-meta text-muted">{message}</p> : null}
    </div>
  )
}
