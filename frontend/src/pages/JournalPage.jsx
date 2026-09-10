import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useResource from '../hooks/useResource.js'
import client from '../api/client.js'
import { useToast } from '../context/ToastContext.jsx'
import { Pagination } from '../components/Wardrobe.jsx'
import OutfitDetail from '../components/OutfitDetail.jsx'
import LookPreview from '../components/LookPreview.jsx'
import { lookDate } from '../utils/date.js'
import CalendarPage from './CalendarPage.jsx'

function SelectedLook({ id, onClose, onDelete }) {
  const { data, loading, error } = useResource(`/outfits/${id}`)
  if (error) return <div className="journal-error" role="alert">This look could not be opened. <button className="text-button" onClick={onClose}>Dismiss</button></div>
  return <OutfitDetail outfit={data} loading={loading} onClose={onClose} onDelete={onDelete} />
}

export default function JournalPage() {
  const [params, setParams] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const showToast = useToast()
  const calendar = params.get('view') === 'calendar'
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)
  const { data, loading, error } = useResource(`/outfits/browse?page=${page}&page_size=6`, revision)
  const selected = /^\d+$/.test(params.get('outfit') || '') ? params.get('outfit') : null
  const update = values => setParams(previous => {
    const next = new URLSearchParams(previous)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    return next
  })
  const remove = async id => {
    if (!window.confirm('Delete this outfit? This cannot be undone.')) return
    try { await client.delete(`/outfits/${id}`); update({ outfit: '' }); setRevision(n => n + 1); showToast('Outfit deleted') }
    catch { showToast('Could not delete outfit') }
  }
  return <div className="journal-page">
    <header className="page-head page-head--split"><div><span className="eyebrow">04 / YOUR STYLE, OVER TIME</span><h1 className="page-title">Worth wearing again.</h1><p className="page-description">A personal archive of good combinations.</p></div><Link className="btn btn--primary" to="/studio">Create a look ↗</Link></header>
    <div className="journal-toolbar"><div className="view-switch" aria-label="Journal view"><button aria-pressed={!calendar} onClick={() => update({ view: '' })}>Looks</button><button aria-pressed={calendar} onClick={() => update({ view: 'calendar' })}>Calendar</button></div><span className="muted">{data ? `${data.total} saved ${data.total === 1 ? 'look' : 'looks'}` : ''}</span></div>
    {calendar ? <CalendarPage embedded /> : loading ? <div className="browse-message" role="status">Opening your journal…</div> : error ? <div className="browse-message" role="alert"><p>Could not load your journal.</p><button className="btn btn--secondary" onClick={() => setRevision(n => n + 1)}>Try again</button></div> : !data?.total ? <div className="browse-message"><h2>The first of many.</h2><p>Put together a look in the Studio, then save it here.</p><Link className="btn btn--primary" to="/studio">Build your first look</Link></div> : <><div className="journal-grid">{data.items.map(outfit => <button key={outfit.id} className="journal-card" onClick={() => update({ outfit: outfit.id })} aria-label={`View outfit from ${lookDate(outfit.date)}`}><LookPreview outfit={outfit} /><span className="journal-card__caption"><strong>{lookDate(outfit.date)}</strong><span>{outfit.note || `${outfit.items.length} pieces · Your own combination`}</span><span aria-hidden="true">↗</span></span></button>)}</div><footer className="browse-footer"><span>Page {data.page} of {data.pages}</span><Pagination page={data.page} pages={data.pages} onChange={p => update({ page: p })} /></footer></>}
    {selected && <SelectedLook id={selected} onClose={() => update({ outfit: '' })} onDelete={remove} />}
  </div>
}
