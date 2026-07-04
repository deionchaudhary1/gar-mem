// Monday-first weekday layout.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad(n) {
  return String(n).padStart(2, '0')
}

export default function CalendarGrid({ year, month, days, onSelectDay }) {
  // month is 1-12
  const byDate = new Map(days.map((d) => [d.date, d]))
  const daysInMonth = new Date(year, month, 0).getDate()
  // JS getDay: 0=Sun..6=Sat -> shift to Mon=0..Sun=6
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7

  const cells = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ empty: true, key: `pad-${i}` })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${pad(month)}-${pad(day)}`
    cells.push({ key: iso, day, entry: byDate.get(iso) })
  }

  return (
    <div className="calendar">
      <div className="calendar__weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar__weekday section-label">
            {w}
          </div>
        ))}
      </div>
      <div className="calendar__grid">
        {cells.map((c) =>
          c.empty ? (
            <div key={c.key} className="calendar__cell calendar__cell--empty" />
          ) : (
            <button
              key={c.key}
              type="button"
              className={`calendar__cell${c.entry ? ' calendar__cell--has' : ''}`}
              disabled={!c.entry}
              onClick={() => c.entry && onSelectDay(c.entry)}
            >
              <span className="calendar__daynum">{c.day}</span>
              {c.entry && (
                <>
                  <span className="calendar__dot" />
                  {c.entry.preview_paths?.length > 0 && (
                    <span className="calendar__previews">
                      {c.entry.preview_paths.slice(0, 4).map((p, i) => (
                        <img key={i} src={p} alt="" />
                      ))}
                    </span>
                  )}
                </>
              )}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
