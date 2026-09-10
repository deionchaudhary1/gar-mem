import { useEffect, useRef, useState } from 'react'
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

export function PieceButton({ garment, onSelect }) {
  return <button className="wardrobe-piece"
    type="button" onClick={() => onSelect(garment)} aria-label={`View ${garment.name}`}>
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
  const size = 24
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const enterFromEnd = useRef(false)
  const wheelGate = useRef(0)
  const [edges, setEdges] = useState({ start: true, end: false })
  const [retry, setRetry] = useState(0)
  const { data, loading, error } = useGarmentPage(category, '', page, size, revision + retry)
  const readEdges = () => {
    const el = trackRef.current
    if (el) setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
  }
  useEffect(() => {
    const el = trackRef.current
    if (!data || !el) return
    el.scrollLeft = enterFromEnd.current ? el.scrollWidth : 0
    enterFromEnd.current = false
    readEdges()
    const observer = new ResizeObserver(readEdges)
    observer.observe(el)
    return () => observer.disconnect()
  }, [data])
  const changeBatch = direction => {
    if (!data || loading) return
    const next = data.page + direction
    if (next < 1 || next > data.pages) return
    enterFromEnd.current = direction < 0
    wheelGate.current = performance.now() + 500
    onPage(next)
  }
  const move = direction => {
    const el = trackRef.current
    if (!el) return
    const atEdge = direction < 0 ? el.scrollLeft <= 1 : el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    if (atEdge) changeBatch(direction)
    else el.scrollBy({ left: direction * el.clientWidth * .85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  useEffect(() => {
    const section = sectionRef.current
    const onWheel = event => {
      if (event.ctrlKey || event.metaKey) return // Preserve pinch/browser zoom.
      const el = trackRef.current
      if (!el || !data || loading) return
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1)
      if (!delta) return
      event.preventDefault()
      if (performance.now() < wheelGate.current) return
      const atEdge = delta < 0 ? el.scrollLeft <= 1 : el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      if (atEdge && Math.abs(delta) >= 8) changeBatch(Math.sign(delta))
      else el.scrollLeft += delta
    }
    section.addEventListener('wheel', onWheel, { passive: false })
    return () => section.removeEventListener('wheel', onWheel)
  })
  return <section ref={sectionRef} className={`wardrobe-section wardrobe-section--${category}`} aria-label={CATEGORY_LABELS[category]}>
    <header className="wardrobe-section__head">
      <button className="section-open" onClick={onExpand}>
        {CATEGORY_LABELS[category]} <span>{data ? `· ${data.total}` : ''}</span><span className="section-open__hint">View all ↗</span>
      </button>
      {data?.total > 0 && <span className="range-count">{(data.page - 1) * size + 1}–{Math.min(data.page * size, data.total)} of {data.total}</span>}
    </header>
    <div className="wardrobe-section__rack">
      <button className="icon-button rack-arrow" aria-label={`Previous ${CATEGORY_LABELS[category].toLowerCase()}`} disabled={!data || (data.page <= 1 && edges.start) || loading} onClick={() => move(-1)}>‹</button>
      <div ref={trackRef} className="rack-pieces" onScroll={readEdges} aria-busy={loading} tabIndex={0}
        role="group" aria-label={`${CATEGORY_LABELS[category]} shelf. Scroll or use left and right arrow keys.`}
        onKeyDown={e => { if (e.target === e.currentTarget && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); move(e.key === 'ArrowLeft' ? -1 : 1) } }}>
        {loading && <p className="rack-message" role="status">Loading pieces…</p>}
        {error && <div className="rack-message" role="alert">Could not load pieces. <button className="text-button" onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
        {data?.total === 0 && <Link className="rack-message" to={`/upload?category=${category}`}>+ Add your first {CATEGORY_LABELS[category].toLowerCase()} piece</Link>}
        {data?.items.map(garment => <PieceButton key={garment.id} garment={garment} onSelect={onSelect} />)}
      </div>
      <button className="icon-button rack-arrow" aria-label={`Next ${CATEGORY_LABELS[category].toLowerCase()}`} disabled={!data || (data.page >= data.pages && edges.end) || loading} onClick={() => move(1)}>›</button>
    </div>
  </section>
}
