/**
 * Affiche l'animation d'enregistrement puis redirige vers la liste.
 * setPhase("saving" | "done" | null)
 */
export async function saveAndGo({ setPhase, navigate, to, notice }) {
  setPhase("done")
  await new Promise((resolve) => {
    window.setTimeout(resolve, 750)
  })
  navigate(to, notice ? { state: { notice } } : undefined)
}

export function busyPhase(phase) {
  return phase === "saving" || phase === "done"
}
