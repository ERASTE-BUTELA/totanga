import { Check, LoaderCircle } from "lucide-react"

/**
 * Animation d'envoi du formulaire de contact.
 * phase: "sending" | "done"
 */
export function SendOverlay({ phase = "sending" }) {
  const text = phase === "done" ? "Message envoyé" : "Envoi en cours…"

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4"
      role="status"
      aria-live="polite"
      aria-busy={phase === "sending"}
    >
      <div className="send-card grid w-full max-w-sm place-items-center gap-4 rounded-panel bg-panel px-8 py-10 text-center shadow-panel">
        {phase === "done" ? (
          <span className="send-check grid h-16 w-16 place-items-center rounded-full bg-available-soft text-available">
            <Check aria-hidden="true" size={36} strokeWidth={2.5} />
          </span>
        ) : (
          <LoaderCircle aria-hidden="true" className="send-spin text-violet" size={48} strokeWidth={2} />
        )}
        <p className="text-section text-heading">{text}</p>
      </div>
    </div>
  )
}
