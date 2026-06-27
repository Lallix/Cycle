import { useEffect } from 'react'
import { useToast } from '../components/ui/Toast'

export function useServiceWorker() {
  const toast = useToast()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Dynamically import so dev mode doesn't break
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          // New version deployed — prompt user to reload
          toast('New version available — tap to update', 'info')
          // Auto reload after 4s if they don't dismiss
          setTimeout(() => window.location.reload(), 4000)
        },
        onOfflineReady() {
          toast('Ready to work offline', 'success')
        },
      })
    }).catch(() => {
      // Dev mode — virtual:pwa-register not available, ignore silently
    })
  }, [])
}
