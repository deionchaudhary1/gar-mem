import { useCallback, useEffect, useState } from 'react'
import client from '../api/client.js'
import CategorySection from '../components/CategorySection.jsx'
import FloatingWardrobe from '../components/FloatingWardrobe.jsx'
import { CATEGORIES } from '../constants.js'
import { useToast } from '../context/ToastContext.jsx'

export default function HomePage() {
  const [garments, setGarments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const showToast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.get('/garments/')
      setGarments(res.data)
    } catch {
      setError('Could not load your closet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = useCallback(
    async (garment) => {
      const remove = async (force) => {
        await client.delete(`/garments/${garment.id}`, {
          params: force ? { force: true } : undefined,
        })
      }
      try {
        await remove(false)
        setGarments((prev) => prev.filter((g) => g.id !== garment.id))
        showToast('Removed from closet')
      } catch (err) {
        if (err?.response?.status === 409 && err.response.data?.detail === 'in_use') {
          const n = err.response.data.outfit_count
          if (
            window.confirm(`Used in ${n} outfit(s) — remove anyway?`)
          ) {
            try {
              await remove(true)
              setGarments((prev) => prev.filter((g) => g.id !== garment.id))
              showToast('Removed from closet')
            } catch {
              showToast('Could not remove piece')
            }
          }
        } else {
          showToast('Could not remove piece')
        }
      }
    },
    [showToast],
  )

  const isEmpty = !loading && garments.length === 0

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">The Closet</h1>
      </header>

      {loading && <p className="loading">Loading…</p>}
      {error && <p className="loading">{error}</p>}

      {isEmpty && (
        <div className="empty-state">
          <FloatingWardrobe />
          <svg
            className="empty-state__hanger"
            width="72"
            height="46"
            viewBox="0 0 64 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M32 4a5 5 0 1 1 5 5c-3 0-5 2-5 5" />
            <path d="M32 14 6 32h52L32 14Z" />
          </svg>
          <p className="empty-state__text">
            Your closet is empty — add a first piece.
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        !isEmpty &&
        CATEGORIES.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            garments={garments.filter((g) => g.category === cat)}
            onDelete={handleDelete}
          />
        ))}
    </div>
  )
}
