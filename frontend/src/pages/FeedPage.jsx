import { useCallback, useEffect, useState } from 'react'
import client from '../api/client.js'
import FeedCard from '../components/FeedCard.jsx'
import { useToast } from '../context/ToastContext.jsx'

const TABS = [
  { scope: 'following', label: 'Following' },
  { scope: 'global', label: 'Discover' },
]

export default function FeedPage() {
  const [scope, setScope] = useState('following')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const showToast = useToast()

  const load = useCallback(
    async (p) => {
      try {
        const res = await client.get('/social/feed', { params: { scope, page: p } })
        setItems((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]))
        setHasMore(res.data.has_more)
        setPage(p)
      } catch {
        showToast('Could not load feed')
      }
    },
    [scope, showToast],
  )

  useEffect(() => {
    setLoading(true)
    setItems([])
    load(1).finally(() => setLoading(false))
  }, [scope, load])

  const loadMore = async () => {
    setLoadingMore(true)
    await load(page + 1)
    setLoadingMore(false)
  }

  const isEmpty = !loading && items.length === 0

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">Feed</h1>
      </header>

      <div className="feed-tabs">
        {TABS.map((t) => (
          <button
            key={t.scope}
            type="button"
            className={`feed-tab${scope === t.scope ? ' feed-tab--active' : ''}`}
            onClick={() => setScope(t.scope)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="loading">Loading…</p>}

      {isEmpty && (
        <p className="empty-state">
          {scope === 'following'
            ? 'Follow people to see their looks here.'
            : 'No public looks yet — be the first to share.'}
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="feed-list">
          {items.map((outfit) => (
            <FeedCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="feed-load-more">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
