import { useState } from 'react'
import { Link } from 'react-router-dom'
import useResource from '../hooks/useResource.js'
import { PieceImage } from '../components/Wardrobe.jsx'
import LookPreview from '../components/LookPreview.jsx'
import { lookDate } from '../utils/date.js'

export default function TodayPage() {
  const [revision, setRevision] = useState(0)
  const pieces = useResource('/garments/browse?page_size=6', revision)
  const looks = useResource('/outfits/browse?page_size=1', revision)
  const latest = looks.data?.items[0]
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return <div className="today-page">
    <header className="page-head page-head--split"><div><span className="eyebrow">YOUR DAILY STARTING POINT</span><h1 className="page-title">A good day to get dressed.</h1><p className="page-description">{date}</p></div><Link className="btn btn--secondary" to="/upload">+ Add a piece</Link></header>
    <div className="today-content">
      <section className="daily-invitation"><span className="eyebrow">THE POSSIBILITIES ARE ALREADY HERE</span><h2>Something familiar.<br /><em>Something you.</em></h2><p>You don’t need a new wardrobe.<br />Just a new way to put it together.</p><Link className="btn btn--primary" to="/studio">Build a look <span aria-hidden="true">↗</span></Link><div className="daily-totals"><span>{pieces.data ? pieces.data.total : '—'} {pieces.data?.total === 1 ? 'piece' : 'pieces'} in your wardrobe</span><span>{looks.data ? looks.data.total : '—'} saved {looks.data?.total === 1 ? 'look' : 'looks'}</span></div></section>
      <section className="daily-memory"><header className="workspace-heading"><h2>Latest in your journal</h2><Link className="text-button" to="/journal">Your journal ↗</Link></header>
        {looks.loading ? <p role="status">Loading your last look…</p> : looks.error ? <div className="browse-message" role="alert"><p>Could not load your looks.</p><button className="text-button" onClick={() => setRevision(n => n + 1)}>Try again</button></div> : latest ? <><Link className="daily-look" to={`/journal?outfit=${latest.id}`} aria-label={`View outfit from ${lookDate(latest.date)}`}><LookPreview outfit={latest} /></Link><div className="memory-caption"><span>{lookDate(latest.date)}</span><Link className="text-button" to={`/studio?outfit=${latest.id}`}>Wear it again ↗</Link></div></> : <div className="browse-message"><h3>Your story starts with a look.</h3><p>Save an outfit in the Studio and find it here next time.</p></div>}
      </section>
      <section className="recent-pieces"><header className="workspace-heading"><h2>Recently added</h2><Link className="text-button" to="/wardrobe">Open wardrobe ↗</Link></header>
        {pieces.loading ? <p role="status">Opening your wardrobe…</p> : pieces.error ? <div role="alert"><p>Could not load your pieces.</p><button className="text-button" onClick={() => setRevision(n => n + 1)}>Try again</button></div> : pieces.data?.total ? <div className="recent-pieces__grid">{pieces.data.items.map(g => <Link key={g.id} className="wardrobe-piece" to={`/studio?garment=${g.id}`} aria-label={`Style ${g.name}`}><span className="wardrobe-piece__image"><PieceImage garment={g} /></span><span className="wardrobe-piece__name">{g.name}</span></Link>)}</div> : <div className="recent-empty"><p>A few favorite pieces are all you need to begin.</p><Link className="text-button" to="/upload">Add your first piece ↗</Link></div>}
      </section>
    </div>
  </div>
}
