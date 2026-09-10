import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/', label: 'Today', end: true },
  { to: '/wardrobe', label: 'Wardrobe' },
  { to: '/studio', label: 'Studio' },
  { to: '/journal', label: 'Journal' },
]

export default function Navbar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (['/login', '/signup'].includes(location.pathname)) {
    return null
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" className="wordmark">
          <span className="brand-mark" aria-hidden="true">gm.</span><span>garment<br />memory<span className="brand-caption">YOUR PERSONAL WARDROBE</span></span>
        </NavLink>
        <nav className="navlinks" aria-label="Main navigation">
          {links.map((l, index) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `navlink${isActive ? ' navlink--active' : ''}`
              }
            >
              <span className="nav-index" aria-hidden="true">0{index + 1}</span><span>{l.label}</span><span className="nav-chevron" aria-hidden="true">↗</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note"><span className="sidebar-note__mark" aria-hidden="true">✳</span><p>Wear what<br /><em>feels like you.</em></p><span>A little less searching.<br />A little more getting dressed.</span></div>
        {user && (
          <div className="navbar__user">
            <button
              type="button"
              className="navbar__user-trigger"
              aria-expanded={open}
              aria-label="Account menu"
              onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
              onClick={() => setOpen((o) => !o)}
            >
              {user.avatar_path ? (
                <img className="avatar avatar--sm" src={user.avatar_path} alt="" />
              ) : (
                <span className="avatar avatar--sm avatar--initial">
                  {user.username[0]?.toUpperCase()}
                </span>
              )}
              <span className="navbar__username">Account</span><span aria-hidden="true">⌄</span>
            </button>

            {open && (
              <>
                <div className="navbar__dropdown-scrim" onClick={() => setOpen(false)} />
                <div className="navbar__dropdown">
                  <span className="account-name">{user.username}</span>
                  <button
                    type="button"
                    className="navbar__dropdown-item"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
