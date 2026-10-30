import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, children, confirmLabel, pending = false, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previous?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!pending) onCancel()
      return
    }
    // Keep Tab focus inside the two-button dialog.
    if (event.key === 'Tab') {
      const first = cancelRef.current
      const last = confirmRef.current
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  return (
    <div className="dialog-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="dialog"
        onKeyDown={handleKeyDown}
      >
        <h2 id="confirm-title">{title}</h2>
        <div id="confirm-body">{children}</div>
        <div className="dialog-actions">
          <button type="button" ref={cancelRef} className="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="button" ref={confirmRef} className="danger" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
