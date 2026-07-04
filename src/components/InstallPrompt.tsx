'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if user already dismissed this session
    if (sessionStorage.getItem('install-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after a short delay
      setTimeout(() => setShow(true), 3000)
    } else {
      // Listen for Android/Chrome install prompt
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setTimeout(() => setShow(true), 3000)
      }
      window.addEventListener('beforeinstallprompt', handler)

      // Also show manual instructions after delay even without the prompt event
      const fallback = setTimeout(() => {
        setShow(true)
      }, 5000)

      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(fallback)
      }
    }
  }, [])

  function dismiss() {
    setShow(false)
    setDismissed(true)
    sessionStorage.setItem('install-dismissed', '1')
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShow(false)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowIOSSteps(s => !s)
    }
  }

  if (!show || dismissed) return null

  return (
    <>
      {/* Floating button on the right side */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}>
        {/* Tab button */}
        <button
          onClick={handleInstall}
          style={{
            background: 'linear-gradient(135deg, #1E1B4B, #4C1D95)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px 0 0 12px',
            padding: '12px 10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            boxShadow: '-4px 0 20px rgba(76,29,149,0.4)',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 22 }}>📲</span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#F59E0B',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            letterSpacing: '0.5px',
          }}>
            Install App
          </span>
        </button>

        {/* Dismiss X */}
        <button
          onClick={dismiss}
          style={{
            background: 'rgba(30,27,75,0.8)',
            color: 'rgba(255,255,255,0.6)',
            border: 'none',
            borderRadius: '0 0 0 8px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'inherit',
            marginTop: 2,
          }}
        >
          ✕
        </button>
      </div>

      {/* iOS instructions panel */}
      {showIOSSteps && isIOS && (
        <div style={{
          position: 'fixed',
          right: 48,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 999,
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          width: 220,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          border: '1px solid rgba(83,74,183,0.2)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E1B4B', marginBottom: 10 }}>
            📲 Add to Home Screen
          </div>
          {[
            { icon: '1️⃣', text: 'Tap the Share button at the bottom of Safari' },
            { icon: '2️⃣', text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: '3️⃣', text: 'Tap "Add" — the app icon appears on your home screen' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4, fontStyle: 'italic' }}>
            Must use Safari browser on iPhone
          </div>
          <button onClick={() => setShowIOSSteps(false)}
            style={{ marginTop: 10, width: '100%', padding: '8px', background: '#EEF2FF', border: 'none', borderRadius: 8, fontSize: 12, color: '#4338CA', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Got it
          </button>
        </div>
      )}

      {/* Android manual instructions panel (when no native prompt) */}
      {showIOSSteps && !isIOS && !deferredPrompt && (
        <div style={{
          position: 'fixed',
          right: 48,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 999,
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          width: 220,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          border: '1px solid rgba(83,74,183,0.2)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E1B4B', marginBottom: 10 }}>
            📲 Add to Home Screen
          </div>
          {[
            { icon: '1️⃣', text: 'Tap the three dots menu ⋮ in Chrome' },
            { icon: '2️⃣', text: 'Tap "Add to Home screen" or "Install app"' },
            { icon: '3️⃣', text: 'Tap "Add" — done!' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
          <button onClick={() => setShowIOSSteps(false)}
            style={{ marginTop: 10, width: '100%', padding: '8px', background: '#EEF2FF', border: 'none', borderRadius: 8, fontSize: 12, color: '#4338CA', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Got it
          </button>
        </div>
      )}
    </>
  )
}
