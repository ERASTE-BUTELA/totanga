import { useEffect, useId, useRef } from "react"

export function ConfirmModal({
  title = "Confirmer la suppression",
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  busy = false,
  onConfirm,
  onClose,
}) {
  const titleId = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    function onKey(event) {
      if (event.key === "Escape" && !busy) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="grid w-full max-w-md gap-3 rounded-panel border border-line bg-panel p-5 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-card text-heading">
          {title}
        </h2>
        <p className="text-meta text-muted">{message}</p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="inline-flex min-h-11 items-center rounded-control border border-line bg-panel px-4 font-semibold text-heading"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-control bg-unavailable px-4 font-semibold text-on-primary disabled:opacity-60"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Patientez…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
