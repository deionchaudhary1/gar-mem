import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import FollowButton from '../components/FollowButton.jsx'
import FeedCard from '../components/FeedCard.jsx'
import OutfitCollage from '../components/OutfitCollage.jsx'

export default function ProfilePage() {
  const { username } = useParams()
  const { setUser } = useAuth()
  const showToast = useToast()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [outfits, setOutfits] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [openOutfit, setOpenOutfit] = useState(null)

  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [savingBio, setSavingBio] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get(`/social/users/${username}`)
      setProfile(res.data)
      setBio(res.data.user.bio || '')
    } catch {
      showToast('Could not load profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [username, showToast])

  const loadOutfits = useCallback(
    async (p) => {
      try {
        const res = await client.get(`/social/users/${username}/outfits`, {
          params: { page: p, per_page: 12 },
        })
        setOutfits((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]))
        setHasMore(res.data.has_more)
        setPage(p)
      } catch {
        showToast('Could not load outfits')
      }
    },
    [username, showToast],
  )

  useEffect(() => {
    setOutfits([])
    loadProfile()
    loadOutfits(1)
  }, [loadProfile, loadOutfits])

  const saveBio = async (e) => {
    e.preventDefault()
    if (savingBio) return
    setSavingBio(true)
    try {
      const res = await client.patch('/auth/me', { bio: bio.trim() ? bio.trim() : null })
      setUser(res.data)
      setProfile((p) => ({ ...p, user: { ...p.user, bio: res.data.bio } }))
      setEditing(false)
      showToast('Profile updated')
    } catch {
      showToast('Could not update profile')
    } finally {
      setSavingBio(false)
    }
  }

  const pickAvatar = async (file) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await client.post('/auth/me/avatar', form)
      setUser(res.data)
      setProfile((p) => ({ ...p, user: { ...p.user, avatar_path: res.data.avatar_path } }))
      showToast('Avatar updated')
    } catch {
      showToast('Could not update avatar')
    }
  }

  if (loading) {
    return <p className="loading">Loading…</p>
  }

  if (!profile) {
    return <p className="empty-state">This profile could not be found.</p>
  }

  const { user, followers, following, outfit_count, is_following, is_me } = profile

  return (
    <div>
      <header className="profile-head">
        <div className="profile-head__avatar-wrap">
          {user.avatar_path ? (
            <img className="avatar avatar--lg" src={user.avatar_path} alt="" />
          ) : (
            <span className="avatar avatar--lg avatar--initial">
              {user.username[0]?.toUpperCase()}
            </span>
          )}
          {is_me && (
            <label className="profile-head__avatar-edit">
              <input
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(e) => pickAvatar(e.target.files?.[0])}
              />
              <span className="btn btn--secondary profile-head__avatar-btn">Change photo</span>
            </label>
          )}
        </div>

        <div className="profile-head__info">
          <h1 className="profile-head__username">{user.username}</h1>

          {!editing && user.bio && <p className="profile-head__bio">{user.bio}</p>}
          {!editing && !user.bio && is_me && (
            <p className="profile-head__bio profile-head__bio--muted">No bio yet.</p>
          )}

          {editing && (
            <form className="profile-edit-form" onSubmit={saveBio}>
              <textarea
                className="text-input textarea"
                rows={3}
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about your closet…"
              />
              <div className="profile-edit-form__actions">
                <button type="submit" className="btn btn--primary" disabled={savingBio}>
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setEditing(false)
                    setBio(user.bio || '')
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="profile-head__counts">
            <span>
              <strong>{followers}</strong> followers
            </span>
            <span>
              <strong>{following}</strong> following
            </span>
            <span>
              <strong>{outfit_count}</strong> fits
            </span>
          </div>

          {is_me ? (
            !editing && (
              <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            )
          ) : (
            <FollowButton
              username={user.username}
              isFollowing={is_following}
              onChange={(next) =>
                setProfile((p) => ({
                  ...p,
                  is_following: next,
                  followers: p.followers + (next ? 1 : -1),
                }))
              }
            />
          )}
        </div>
      </header>

      {outfits.length === 0 ? (
        <p className="empty-state">No shared looks yet.</p>
      ) : (
        <div className="profile-grid">
          {outfits.map((o) => (
            <button
              key={o.id}
              type="button"
              className="profile-grid__item"
              onClick={() => setOpenOutfit(o)}
            >
              <OutfitCollage outfit={o} />
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="feed-load-more">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => loadOutfits(page + 1)}
          >
            Load more
          </button>
        </div>
      )}

      {openOutfit && (
        <div className="modal-overlay" onClick={() => setOpenOutfit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button
              type="button"
              className="modal__close"
              onClick={() => setOpenOutfit(null)}
              aria-label="Close"
            >
              ×
            </button>
            <FeedCard outfit={openOutfit} />
          </div>
        </div>
      )}
    </div>
  )
}
