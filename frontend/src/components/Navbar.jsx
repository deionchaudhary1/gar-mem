import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Closet', end: true },
  { to: '/upload', label: 'Upload' },
  { to: '/ootd', label: 'OOTD' },
  { to: '/calendar', label: 'Calendar' },
]

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" className="wordmark">
          Garment Memory
        </NavLink>
        <nav className="navlinks">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `navlink${isActive ? ' navlink--active' : ''}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
