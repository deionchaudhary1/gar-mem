import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client.js'
import { useToast } from '../context/ToastContext.jsx'
import OutfitCollage from './OutfitCollage.jsx'
import CommentList from './CommentList.jsx'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function FeedCard({ outfit }) {
  const [liked, setLiked] = useState(outfit.liked_by_me)
  const [likeCount, setLikeCount] = useState(outfit.like_count)
  const [commentCount, setCommentCount] = useState(outfit.comment_count)
  const [showComments, setShowComments] = useState(false)
  const showToast = useToast()

  const toggleLike = async () => {
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((c) => c + (nextLiked ? 1 : -1))
    try {
      if (nextLiked) {
        await client.post(`/social/outfits/${outfit.id}/like`)
      } else {
        await client.delete(`/social/outfits/${outfit.id}/like`)
      }
    } catch {
      setLiked(!nextLiked)
      setLikeCount((c) => c + (nextLiked ? -1 : 1))
      showToast('Could not update like')
    }
  }

  return (
    <article className="feed-card">
      <header className="feed-card__head">
        <Link to={`/u/${outfit.user.username}`} className="feed-card__user">
          {outfit.user.avatar_path ? (
            <img className="avatar avatar--sm" src={outfit.user.avatar_path} alt="" />
          ) : (
            <span className="avatar avatar--sm avatar--initial">
              {outfit.user.username[0]?.toUpperCase()}
            </span>
          )}
          <span className="feed-card__username">{outfit.user.username}</span>
        </Link>
        <span className="feed-card__date">{formatDate(outfit.created_at)}</span>
      </header>

      <div className="feed-card__body">
        <OutfitCollage outfit={outfit} />
        {outfit.selfie_path && (
          <img className="feed-card__selfie" src={outfit.selfie_path} alt="Selfie" />
        )}
      </div>

      {outfit.note && <p className="feed-card__note">{outfit.note}</p>}

      <div className="feed-card__actions">
        <button
          type="button"
          className={`feed-card__like${liked ? ' feed-card__like--active' : ''}`}
          onClick={toggleLike}
        >
          <span className="feed-card__heart">{liked ? '♥' : '♡'}</span> {likeCount}
        </button>
        <button
          type="button"
          className="feed-card__comment-toggle"
          onClick={() => setShowComments((s) => !s)}
        >
          {commentCount} comment{commentCount === 1 ? '' : 's'}
        </button>
      </div>

      {showComments && (
        <CommentList
          outfitId={outfit.id}
          outfitOwnerId={outfit.user.id}
          onCountChange={(updater) => setCommentCount(updater)}
        />
      )}
    </article>
  )
}
