import { useCallback, useEffect, useRef, useState } from "react"

function sameCriteria(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.query === b.query
    && a.sort === b.sort
    && a.page === b.page
    && a.pageSize === b.pageSize
    && a.from === b.from
    && a.to === b.to
    && JSON.stringify(a.chosen || {}) === JSON.stringify(b.chosen || {})
  )
}

export function usePagedCatalog(load) {
  const [criteria, setCriteria] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [version, setVersion] = useState(0)
  const requestId = useRef(0)
  const onPageRequest = useCallback((next) => {
    setCriteria((current) => (sameCriteria(current, next) ? current : next))
  }, [])

  useEffect(() => {
    if (!criteria) return undefined
    const id = ++requestId.current
    load(criteria).then((result) => {
      if (id !== requestId.current) return
      if (!result.ok) setError(result.error)
      else {
        setError("")
        setData(result.data)
      }
    })
    return undefined
  }, [criteria, load, version])

  return {
    data,
    error,
    onPageRequest,
    reload: () => setVersion((value) => value + 1),
  }
}
