/**
 * LoadingScreen — Isolated branding component
 * Replace the BrandLogo component with production assets in Version 2.
 * This file can be replaced entirely without touching app architecture.
 */

import BrandLogo from '../branding/BrandLogo'

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-[9999]">
      <BrandLogo size={80} animated />
      <p className="mt-8 text-sm text-muted animate-pulse">{message}</p>
    </div>
  )
}
