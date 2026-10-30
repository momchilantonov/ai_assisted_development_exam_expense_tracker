import { useContext } from 'react'
import { ToastContext, type ToastApi } from './toastContext'

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
