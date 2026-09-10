import { useEffect, useState } from 'react'
import client from '../api/client.js'

export default function useResource(url, revision = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: false })
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, loading: true, error: false })
    client.get(url, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: false })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: true })
    })
    return () => controller.abort()
  }, [url, revision])
  return state
}
