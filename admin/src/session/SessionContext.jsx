import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { loadSession, login as loginRequest, logout as logoutRequest } from "../api/session.js"

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [state, setState] = useState({
    status: "loading",
    account: null,
    expired: false,
    unavailable: false,
  })

  useEffect(() => {
    let active = true
    loadSession().then((result) => {
      if (!active) return
      setState({ status: "ready", ...result })
    })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      async signIn(username, password) {
        const result = await loginRequest(username, password)
        if (result.account) {
          setState({
            status: "ready",
            account: result.account,
            expired: false,
            unavailable: false,
          })
        }
        return result
      },
      async signOut() {
        await logoutRequest()
        setState({
          status: "ready",
          account: null,
          expired: false,
          unavailable: false,
        })
      },
      expire() {
        setState({
          status: "ready",
          account: null,
          expired: true,
          unavailable: false,
        })
      },
    }),
    [state],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error("Session hors contexte")
  return value
}
