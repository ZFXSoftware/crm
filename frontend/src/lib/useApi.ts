import { useEffect, useRef, useState } from 'react'

export type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const counter = useRef(0)

  function load() {
    const id = ++counter.current
    setLoading(true)
    setError(null)
    fetcher()
      .then((res) => { if (id === counter.current) { setData(res); setLoading(false) } })
      .catch((err) => { if (id === counter.current) { setError(err.message ?? 'Error'); setLoading(false) } })
  }

  useEffect(load, deps)

  return { data, loading, error, refetch: load }
}
