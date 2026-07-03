import { useEffect } from 'react'

// Cache buster — forces reload when a new build is deployed
// Works by comparing the build timestamp baked into the JS bundle
// against a fresh fetch of the SW file (bypassing cache)

export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Register the PWA service worker via vite-plugin-pwa
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({
        // autoUpdate mode — SW activates immediately, page reloads on next navigation
        immediate: true,
        onRegisteredSW(swUrl, r) {
          if (!r) return
          // Poll every 60 seconds for a new SW version
          setInterval(async () => {
            if (r.installing || !navigator.onLine) return
            try {
              const resp = await fetch(swUrl, {
                cache: 'no-store',
                headers: { 'cache-control': 'no-cache' },
              })
              if (resp?.status === 200) await r.update()
            } catch { /* offline — ignore */ }
          }, 60 * 1000)
        },
        onNeedRefresh() {
          // New SW ready — reload immediately (autoUpdate mode)
          window.location.reload()
        },
        onOfflineReady() {
          console.log('[SW] Ready to work offline')
        },
      })
    }).catch(() => {
      // Dev mode — virtual:pwa-register not available
    })

    // Hard reload when app resumes from background and SW has updated
    // This is the main fix for "app not opening after phone lock"
    let hidden = false
    function handleVisibilityChange() {
      if (document.hidden) {
        hidden = true
      } else if (hidden) {
        hidden = false
        // Check if SW was updated while app was in background
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg?.waiting) {
            // New SW is waiting — tell it to take over
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
            // Reload to get the new version
            window.location.reload()
          }
        }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
