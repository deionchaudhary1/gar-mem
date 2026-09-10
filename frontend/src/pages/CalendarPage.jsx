import { useCallback, useEffect, useState } from 'react'
import client from '../api/client.js'
import CalendarGrid from '../components/CalendarGrid.jsx'
import OutfitDetail from '../components/OutfitDetail.jsx'
import { useToast } from '../context/ToastContext.jsx'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarPage({ embedded = false }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)

  const [openId, setOpenId] = useState(null)
  const [outfit, setOutfit] = useState(null)
  const [outfitLoading, setOutfitLoading] = useState(false)

  const showToast = useToast()

  const loadMonth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/calendar/', { params: { year, month } })
      setDays(res.data.days || [])
    } catch {
      showToast('Could not load calendar')
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [year, month, showToast])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const step = (dir) => {
    let m = month + dir
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  const openOutfit = async (entry) => {
    setOpenId(entry.outfit_id)
    setOutfit(null)
    setOutfitLoading(true)
    try {
      const res = await client.get(`/outfits/${entry.outfit_id}`)
      setOutfit(res.data)
    } catch {
      showToast('Could not load outfit')
      setOpenId(null)
    } finally {
      setOutfitLoading(false)
    }
  }

  const closeModal = () => {
    setOpenId(null)
    setOutfit(null)
  }

  const deleteOutfit = async (id) => {
    if (!window.confirm('Delete this outfit? This cannot be undone.')) return
    try {
      await client.delete(`/outfits/${id}`)
      showToast('Outfit deleted')
      closeModal()
      loadMonth()
    } catch {
      showToast('Could not delete outfit')
    }
  }

  return (
    <div className="calendar-page">
      {!embedded && <header className="page-head page-head--split"><div><span className="eyebrow">04 / THE DAILY ARCHIVE</span><h1 className="page-title">Days worth remembering.</h1><p className="page-description">Your outfits, one day at a time.</p></div></header>}
      <header className="calendar-head">
        <button className="btn btn--secondary" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}>This month</button>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => step(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="page-title calendar-title">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => step(1)}
          aria-label="Next month"
        >
          ›
        </button>
      </header>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <CalendarGrid
          year={year}
          month={month}
          days={days}
          onSelectDay={openOutfit}
        />
      )}

      {openId && (
        <OutfitDetail
          outfit={outfit}
          loading={outfitLoading}
          onClose={closeModal}
          onDelete={deleteOutfit}
        />
      )}
    </div>
  )
}
