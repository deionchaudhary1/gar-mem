import { useState } from 'react'
import client from '../api/client.js'
import { useToast } from '../context/ToastContext.jsx'

export default function FollowButton({ username, isFollowing, onChange }) {
  const [busy, setBusy] = useState(false)
  const showToast = useToast()

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    const next = !isFollowing
    onChange(next)
    try {
      if (next) {
        await client.post(`/social/follow/${username}`)
      } else {
        await client.delete(`/social/follow/${username}`)
      }
    } catch {
      onChange(isFollowing)
      showToast('Could not update follow status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`btn ${isFollowing ? 'btn--secondary' : 'btn--primary'}`}
      onClick={toggle}
      disabled={busy}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
