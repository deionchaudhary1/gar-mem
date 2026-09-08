import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABELS } from '../constants.js'
import useGarmentPage from '../hooks/useGarmentPage.js'

export function PieceImage({ garment, full = false }) {
  const [failed, setFailed] = useState(false)
  return failed ? <span className="piece-unavailable">Image unavailable</span> : (
    <img src={full ? garment.image_path : (garment.thumbnail_path || garment.image_path)}
      alt={garment.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  )
}

export function Hanger() {
  return <svg className="hanger" viewBox="0 0 120 46" fill="none" aria-hidden="true">
    <path d="M60 15V11c0-5 8-4 8-9" stroke="currentColor" strokeWidth="2" />
    <path d="M60 15 8 39q-4 4 3 4h98q7 0 3-4L60 15Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
  </svg>
}

export function PieceButton({ garment, onSelect, hanging = false }) {
  return <button className={`wardrobe-piece${hanging ? ' wardrobe-piece--hanging' : ''}`}
    type="button" onClick={() => onSelect(garment)} aria-label={`View ${garment.name}`}>
    {hanging && <Hanger />}
    <span className="wardrobe-piece__image"><PieceImage garment={garment} /></span>
    <span className="wardrobe-piece__name">{garment.name}</span>
  </button>
}

export function Pagination({ page, pages, onChange, label = 'Pages' }) {
  const visible = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter(p => p >= 1 && p <= pages).sort((a, b) => a - b)
  return <nav className="pagination" aria-label={label}>
    <button className="icon-button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">‹</button>
    {visible.map((p, i) => <span key={p}>
      {i > 0 && p - visible[i - 1] > 1 && <span className="pagination__gap">…</span>}
      <button className="icon-button" aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>
    </span>)}
    <button className="icon-button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">›</button>
  </nav>
}

export default function WardrobeSection({ category, page, onPage, onExpand, onSelect, revision }) {
  const size = category === 'tops' ? 4 : 2
  const [retry, setRetry] = useState(0)
  const { data, loading, error } = useGarmentPage(category, '', page, size, revision + retry)
  const hanging = category === 'tops' || category === 'pants'
  return <section className={`wardrobe-section wardrobe-section--${category}`} aria-label={CATEGORY_LABELS[category]}>
    <header className="wardrobe-section__head">
      <button className="section-open" onClick={onExpand}>
        {CATEGORY_LABELS[category]} <span>{data ? `· ${data.total}` : ''}</span><span className="section-open__hint">View all ↗</span>
      </button>
      {data?.total > 0 && <span className="range-count">{(data.page - 1) * size + 1}–{Math.min(data.page * size, data.total)} of {data.total}</span>}
    </header>
    <div className={`wardrobe-section__rack${hanging ? ' wardrobe-section__rack--hanging' : ''}`}>
      <button className="icon-button rack-arrow" aria-label={`Previous ${CATEGORY_LABELS[category].toLowerCase()}`} disabled={!data || data.page <= 1 || loading} onClick={() => onPage(data.page - 1)}>‹</button>
      <div className="rack-pieces" style={{ '--pieces': size }} aria-busy={loading}>
        {loading && <p className="rack-message" role="status">Loading pieces…</p>}
        {error && <div className="rack-message" role="alert">Could not load pieces. <button className="text-button" onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
        {data?.total === 0 && <Link className="rack-message" to={`/upload?category=${category}`}>+ Add your first {CATEGORY_LABELS[category].toLowerCase()} piece</Link>}
        {data?.items.map(garment => <PieceButton key={garment.id} garment={garment} hanging={hanging} onSelect={onSelect} />)}
      </div>
      <button className="icon-button rack-arrow" aria-label={`Next ${CATEGORY_LABELS[category].toLowerCase()}`} disabled={!data || data.page >= data.pages || loading} onClick={() => onPage(data.page + 1)}>›</button>
    </div>
  </section>
}
