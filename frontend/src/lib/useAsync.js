import { useEffect, useState } from "react"
import { USER_FACING_ERROR_MESSAGE } from "./errors.js"

export function useAsync(loader, deps) {
  const [state, setState] = useState({ status: "loading", data: null, error: "" })

  useEffect(() => {
    let active = true
    setState({ status: "loading", data: null, error: "" })
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (active) setState({ status: "ready", data, error: "" })
      })
      .catch((cause) => {
        if (!active) return
        const message = cause?.message === USER_FACING_ERROR_MESSAGE ? cause.message : USER_FACING_ERROR_MESSAGE
        setState({ status: "error", data: null, error: message })
      })
    return () => {
      active = false
    }
  }, deps)

  return state
}
