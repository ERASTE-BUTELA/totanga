import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"

/** Affiche un message passé par saveAndGo, une seule fois. */
export function useListNotice() {
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState("")

  useEffect(() => {
    const message = location.state?.notice
    if (!message) return
    setNotice(message)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

  return [notice, setNotice]
}
