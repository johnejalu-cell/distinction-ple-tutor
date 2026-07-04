'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'parent' },
        },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      // Auto sign in after signup
      await supabase.auth.signInWithPassword({ email, password })
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError('Incorrect email or password. Please try again.')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: '#534AB7',
        padding: '40px 24px 32px',
        color: '#fff',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
          Get Ready 4 PLE
        </div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Smart AI tutoring and exam revision for PLE preparation
        </div>
        <a href="/" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
          ← Back to home
        </a>
      </div>

      {/* Form */}
      <div style={{ padding: '28px 20px', flex: 1 }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: '#F1EFE8',
          borderRadius: 10,
          padding: 4,
          marginBottom: 24,
        }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1,
                padding: '9px',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#534AB7' : '#888780',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
              Your full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sarah Nakato"
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#FCEBEB', border: '0.5px solid rgba(163,45,45,0.3)',
            borderRadius: 10, padding: '12px 14px', fontSize: 13,
            color: '#A32D2D', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading || !email || !password || (mode === 'signup' && !fullName)}
        >
          {loading
            ? 'Please wait...'
            : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        {mode === 'login' && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#888780', marginTop: 20 }}>
            New here?{' '}
            <span
              onClick={() => setMode('signup')}
              style={{ color: '#534AB7', cursor: 'pointer', fontWeight: 500 }}
            >
              Create a free account
            </span>
          </p>
        )}

        <div style={{
          marginTop: 32, padding: 16,
          background: '#E1F5EE', borderRadius: 12,
          fontSize: 13, color: '#0F6E56', lineHeight: 1.6,
        }}>
          <strong>For parents & guardians</strong><br />
          Create one account and add all your P7 children. Track their progress from your parent dashboard.
        </div>
      </div>
    </div>
  )
}
