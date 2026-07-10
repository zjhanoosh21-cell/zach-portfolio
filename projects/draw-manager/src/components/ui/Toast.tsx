'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string | null
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="fixed top-16 md:top-4 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
      <div className="bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg pointer-events-auto flex items-center gap-2">
        <span>✓</span>
        <span>{message}</span>
      </div>
    </div>
  )
}
