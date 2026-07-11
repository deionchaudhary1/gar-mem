// Decorative drifting garment doodles. Purely visual: aria-hidden, no pointer
// events, and fully disabled under prefers-reduced-motion (see index.css).

function Hanger(props) {
  return (
    <svg viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M32 4a5 5 0 1 1 5 5c-3 0-5 2-5 5" />
      <path d="M32 14 6 32h52L32 14Z" />
    </svg>
  )
}

function Tee(props) {
  return (
    <svg viewBox="0 0 64 56" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 6 8 16l6 10 6-4v28h24V22l6 4 6-10L42 6a10 10 0 0 1-20 0Z" />
    </svg>
  )
}

function Trousers(props) {
  return (
    <svg viewBox="0 0 40 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 4h24l4 52H26l-6-32-6 32H4L8 4Z" />
    </svg>
  )
}

function ShirtButton(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...props}>
      <circle cx="16" cy="16" r="13" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="20" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
      <circle cx="20" cy="20" r="1" fill="currentColor" />
    </svg>
  )
}

function Sneaker(props) {
  return (
    <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 24V12c6 4 12 6 16 4l6-6c8 8 20 10 34 12v6H4Z" />
      <path d="M4 28h56" />
    </svg>
  )
}

// Each entry: which doodle, where it sits, its size, and its drift timing.
const FLOATERS = [
  { C: Hanger, style: { top: '12%', left: '8%', width: 56, '--drift-dur': '11s', '--drift-delay': '0s', '--tilt': '-8deg' } },
  { C: Tee, style: { top: '22%', right: '10%', width: 48, '--drift-dur': '13s', '--drift-delay': '-4s', '--tilt': '6deg' } },
  { C: ShirtButton, style: { top: '58%', left: '14%', width: 26, '--drift-dur': '9s', '--drift-delay': '-2s', '--tilt': '0deg' } },
  { C: Trousers, style: { bottom: '14%', right: '16%', width: 36, '--drift-dur': '14s', '--drift-delay': '-7s', '--tilt': '-5deg' } },
  { C: Sneaker, style: { bottom: '10%', left: '26%', width: 52, '--drift-dur': '12s', '--drift-delay': '-9s', '--tilt': '4deg' } },
  { C: Hanger, style: { top: '70%', right: '6%', width: 34, '--drift-dur': '10s', '--drift-delay': '-5s', '--tilt': '10deg' } },
  { C: ShirtButton, style: { top: '8%', right: '30%', width: 18, '--drift-dur': '15s', '--drift-delay': '-11s', '--tilt': '0deg' } },
]

export default function FloatingWardrobe() {
  return (
    <div className="floaters" aria-hidden="true">
      {FLOATERS.map(({ C, style }, i) => (
        <span key={i} className="floater" style={style}>
          <C />
        </span>
      ))}
    </div>
  )
}
