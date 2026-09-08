import { useEffect, useState } from 'react'
import client from '../api/client.js'

export default function useGarmentPage(category, q, page, pageSize, revision = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: false })
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, loading: true, error: false })
    const timer = setTimeout(() => {
      client.get('/garments/browse', {
        params: { category: category || undefined, q, page, page_size: pageSize },
        signal: controller.signal,
      }).then(({ data }) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: false })
      }).catch(() => {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: true })
      })
    }, q ? 200 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [category, q, page, pageSize, revision])
  return state
}
