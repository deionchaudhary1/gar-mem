export default function DiceButton({ label, onRoll, disabled }) {
  return (
    <button
      type="button"
      className="dice"
      onClick={onRoll}
      disabled={disabled}
      title={disabled ? 'Nothing to shuffle yet' : label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" />
        <circle cx="8" cy="8" r="1.7" />
        <circle cx="16" cy="8" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="8" cy="16" r="1.7" />
        <circle cx="16" cy="16" r="1.7" />
      </svg>
    </button>
  )
}
