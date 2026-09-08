import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import client from '../api/client.js'
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js'
import { useToast } from '../context/ToastContext.jsx'
import useGarmentPage from '../hooks/useGarmentPage.js'
import WardrobeSection, { Pagination, PieceButton } from '../components/Wardrobe.jsx'
import GarmentDetail from '../components/GarmentDetail.jsx'

const pageNumber = value => Math.max(1, Math.min(100000, Number.parseInt(value, 10) || 1))

function CategoryBrowser({ category, q, page, revision, onPage, onCategory, onSelect, onRetry }) {
  const { data, loading, error } = useGarmentPage(category, q, page, 12, revision)
  return <div className="category-browser">
    <div className="category-tabs" aria-label="Filter category">
      {['', ...CATEGORIES].map(c => <button key={c} className="category-tab" aria-pressed={c === category}
        onClick={() => onCategory(c)}>{c ? CATEGORY_LABELS[c] : 'All pieces'}{data && <span>{c ? data.counts[c] : Object.values(data.counts).reduce((a, b) => a + b, 0)}</span>}</button>)}
    </div>
    {loading ? <div className="browse-message" role="status">Finding your pieces…</div>
      : error ? <div className="browse-message" role="alert"><p>Could not load your closet.</p><button className="btn btn--secondary" onClick={onRetry}>Try again</button></div>
      : data?.total === 0 ? <div className="browse-message"><h2>No pieces found</h2><p>Try a different name or category.</p><Link to={`/upload?category=${category || 'tops'}`}>Add a piece</Link></div>
      : <div className="browse-grid">{data?.items.map(g => <PieceButton key={g.id} garment={g} onSelect={onSelect} />)}</div>}
    <footer className="browse-footer">
      <span aria-live="polite">{data ? `${data.total} ${data.total === 1 ? 'piece' : 'pieces'} · Page ${data.page} of ${data.pages}` : ' '}</span>
      {data && <Pagination page={data.page} pages={data.pages} onChange={onPage} />}
    </footer>
  </div>
}

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const category = CATEGORIES.includes(params.get('category')) ? params.get('category') : ''
  const q = params.get('q') || ''
  const expanded = !!category || !!q || params.get('view') === 'all'
  const [selected, setSelected] = useState(null)
  const [revision, setRevision] = useState(0)
  const showToast = useToast()
  const update = (values, replace = false) => setParams(prev => {
    const next = new URLSearchParams(prev)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    return next
  }, { replace })
  const handleDelete = async garment => {
    if (!window.confirm(`Remove “${garment.name}” from your closet? This cannot be undone.`)) return false
    try {
      await client.delete(`/garments/${garment.id}`)
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.detail === 'in_use') {
        if (!window.confirm(`This piece appears in ${err.response.data.outfit_count} saved outfit(s). Remove it from those outfits too?`)) return false
        try { await client.delete(`/garments/${garment.id}`, { params: { force: true } }) }
        catch { showToast('Could not remove piece'); return false }
      } else { showToast('Could not remove piece'); return false }
    }
    setRevision(n => n + 1)
    showToast('Removed from closet')
    return true
  }
  return <div className="closet-page">
    <header className="page-head closet-toolbar">
      <div className="closet-heading">
        {expanded && <button className="text-button" onClick={() => update({ category: '', q: '', page: '', view: '' })}>← Back to closet</button>}
        <h1 className="page-title">{expanded ? (q ? 'Find your pieces' : CATEGORY_LABELS[category] || 'All pieces') : 'Open wardrobe'}</h1>
      </div>
      <div className="closet-actions">
        <label className="closet-search"><span className="visually-hidden">Find a piece by name or category</span><span aria-hidden="true">⌕</span>
          <input type="search" value={q} maxLength={120} placeholder="Find a piece" onChange={e => update({ q: e.target.value, page: '' }, true)} />
        </label>
        <Link className="btn btn--primary" to={`/upload${category ? `?category=${category}` : ''}`}>+ Add piece</Link>
      </div>
    </header>
    {expanded ? <CategoryBrowser {...{ category, q, revision }} page={pageNumber(params.get('page'))}
      onPage={p => update({ page: p })} onCategory={c => update({ category: c, page: '', view: c ? '' : 'all' })}
      onSelect={setSelected} onRetry={() => setRevision(n => n + 1)} />
      : <><div className="open-wardrobe">{CATEGORIES.map(c => <WardrobeSection key={c} category={c}
        page={pageNumber(params.get(`${c}Page`))} onPage={p => update({ [`${c}Page`]: p }, true)}
        onExpand={() => update({ category: c, page: '' })} onSelect={setSelected} revision={revision} />)}</div>
        <p className="wardrobe-caption">Click a piece to view details. Open a category to explore everything.</p></>}
    {selected && <GarmentDetail garment={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
  </div>
}
