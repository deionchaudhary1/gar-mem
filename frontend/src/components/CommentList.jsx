import { useEffect, useState } from 'react'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function CommentList({ outfitId, outfitOwnerId, onCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    let active = true
    setLoading(true)
    client
      .get(`/social/outfits/${outfitId}/comments`)
      .then((res) => {
        if (active) setComments(res.data)
      })
      .catch(() => {
        if (active) showToast('Could not load comments')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [outfitId, showToast])

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || posting) return
    setPosting(true)
    try {
      const res = await client.post(`/social/outfits/${outfitId}/comments`, { text: trimmed })
      setComments((prev) => [...prev, res.data])
      setText('')
      onCountChange?.((c) => c + 1)
    } catch {
      showToast('Could not post comment')
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id) => {
    try {
      await client.delete(`/social/comments/${id}`)
      setComments((prev) => prev.filter((c) => c.id !== id))
      onCountChange?.((c) => Math.max(0, c - 1))
    } catch {
      showToast('Could not delete comment')
    }
  }

  return (
    <div className="comment-list">
      {loading && <p className="loading">Loading comments…</p>}
      {!loading && comments.length === 0 && (
        <p className="comment-list__empty">No comments yet.</p>
      )}
      {!loading &&
        comments.map((c) => (
          <div key={c.id} className="comment-row">
            <span className="comment-row__user">{c.user.username}</span>
            <span className="comment-row__text">{c.text}</span>
            {(c.user.id === user?.id || outfitOwnerId === user?.id) && (
              <button
                type="button"
                className="comment-row__delete"
                onClick={() => remove(c.id)}
                aria-label="Delete comment"
              >
                ×
              </button>
            )}
          </div>
        ))}
      <form className="comment-form" onSubmit={submit}>
        <input
          className="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          maxLength={500}
        />
        <button type="submit" className="btn btn--secondary" disabled={posting || !text.trim()}>
          Post
        </button>
      </form>
    </div>
  )
}
