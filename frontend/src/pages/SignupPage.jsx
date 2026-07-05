import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function SignupPage() {
  const { user, loading, signup } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await signup(email.trim(), username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Start your closet.</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="section-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="section-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              pattern="[a-z0-9_]{3,20}"
              title="3-20 lowercase letters, numbers, or underscores"
              required
            />
          </div>
          <div className="field">
            <label className="section-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn--primary auth-submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="auth-swap">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
