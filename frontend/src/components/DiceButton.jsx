import ShuffleIcon from './ShuffleIcon.jsx'

export default function DiceButton({ label, onRoll, disabled }) {
  return (
    <button
      type="button"
      className="shuffle-button"
      onClick={onRoll}
      disabled={disabled}
      title={disabled ? 'Nothing to shuffle yet' : label}
      aria-label={label}
    >
      <ShuffleIcon />
    </button>
  )
}
