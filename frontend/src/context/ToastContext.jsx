import { createContext, useCallback, useContext, useRef, useState } from 'react'

// App-wide toast notifications: any component calls useToast() to get a
// showToast(message) function, and a single toast element (rendered here,
// mounted once at the provider) fades in/out for ~2.9s per call.
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { message, visible }
  const timers = useRef([])

  const showToast = useCallback((message) => {
    // clear any pending timers
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
    setToast({ message, visible: true })
    timers.current.push(
      setTimeout(() => setToast((t) => (t ? { ...t, visible: false } : t)), 2600),
    )
    timers.current.push(setTimeout(() => setToast(null), 2900))
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast${toast.visible ? ' toast--visible' : ''}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
