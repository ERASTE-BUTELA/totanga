import { useCallback, useEffect, useState } from "react"

export function usePagedCatalog(load) {
  const [criteria, setCriteria] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [version, setVersion] = useState(0)
  const onPageRequest = useCallback((next) => setCriteria(next), [])

  useEffect(() => {
    if (!criteria) return undefined
    let gone = false
    load(criteria).then((result) => {
      if (gone) return
      if (!result.ok) setError(result.error)
      else {
        setError("")
        setData(result.data)
      }
    })
    return () => {
      gone = true
    }
  }, [criteria, load, version])

  return {
    data,
    error,
    onPageRequest,
    reload: () => setVersion((value) => value + 1),
  }
}
