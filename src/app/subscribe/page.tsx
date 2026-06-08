'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SubscribePage() {
  const [profile, setProfile] = useState<{ full_name: string; is_subscribed: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Placeholder — replace with your actual merchant details
  const MERCHANT_NUMBER = 'XXXXXXXXXX'
  const MERCHANT_NAME = 'Distinction PLE Tutor'
  const AMOUNT = 'UGX 25,000'

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, is_subscribed')
      .eq('id', user.id)
      .single()

    if (data?.is_subscribed) {
      router.push('/dashboard')
      return
    }

    setProfile(data)
    setLoading(false)
  }

  function copyNumber() {
    navigator.clipboard.writeText(MERCHANT_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🎓</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8F9FF' }}>

      {/* Header */}
      <div style={{ background: '#534AB7', padding: '24px 20px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎓</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Upgrade to Premium</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Continue your child&apos;s PLE preparation without limits
        </div>
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>

        {/* Current plan notice */}
        <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B', marginBottom: 4 }}>
            ⚠️ You are on the Limited Free Plan
          </div>
          <div style={{ fontSize: 13, color: '#854F0B', lineHeight: 1.6 }}>
            You currently have access to <strong>3 practice questions per day</strong> only. Upgrade to unlock everything.
          </div>
        </div>

        {/* Comparison */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>What you&apos;re missing</div>

          {[
            { feature: 'Practice questions', free: '3/day', premium: 'Unlimited', icon: '✏️' },
            { feature: 'AI Tutor', free: '❌', premium: '✅ Unlimited', icon: '🤖' },
            { feature: 'Image upload to tutor', free: '❌', premium: '✅', icon: '📷' },
            { feature: 'Mock exams', free: '❌', premium: '✅ All types', icon: '📝' },
            { feature: 'Progress tracking', free: '❌', premium: '✅ Full history', icon: '📊' },
            { feature: 'Adaptive learning', free: '❌', premium: '✅', icon: '🎯' },
            { feature: 'Parent dashboard', free: '❌', premium: '✅', icon: '👨‍👩‍👧' },
            { feature: 'Student profiles', free: '1 limited', premium: 'Up to 3', icon: '👦' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 7 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize: 16, width: 24 }}>{r.icon}</span>
              <div style={{ flex: 1, fontSize: 13, color: '#1a1a2e' }}>{r.feature}</div>
              <div style={{ fontSize: 12, color: '#A32D2D', width: 60, textAlign: 'center' }}>{r.free}</div>
              <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500, width: 90, textAlign: 'right' }}>{r.premium}</div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, color: '#A32D2D', width: 60, textAlign: 'center', fontWeight: 600 }}>FREE</div>
            <div style={{ fontSize: 11, color: '#1D9E75', width: 90, textAlign: 'right', fontWeight: 600 }}>PREMIUM</div>
          </div>
        </div>

        {/* Price */}
        <div style={{ background: '#534AB7', borderRadius: 12, padding: 20, marginBottom: 20, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Premium subscription</div>
          <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4 }}>UGX 25,000</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>per month · cancel any time</div>
        </div>

        {/* Payment instructions */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            📱 How to pay via Mobile Money
          </div>

          {/* MTN */}
          <div style={{ background: '#FAEEDA', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#854F0B', marginBottom: 8 }}>
              🟡 MTN Mobile Money
            </div>
            {[
              'Dial *165# on your MTN line',
              'Select 1 — Transfer money',
              'Select 4 — Send to code',
              `Enter merchant code: ${MERCHANT_NUMBER}`,
              `Enter amount: 25000`,
              'Enter your PIN to confirm',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#BA7517', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.4 }}>{step}</div>
              </div>
            ))}
          </div>

          {/* Airtel */}
          <div style={{ background: '#FAECE7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#993C1D', marginBottom: 8 }}>
              🔴 Airtel Money
            </div>
            {[
              'Dial *185# on your Airtel line',
              'Select 1 — Make payment',
              'Select 3 — Pay merchant',
              `Enter merchant code: ${MERCHANT_NUMBER}`,
              `Enter amount: 25000`,
              'Enter your PIN to confirm',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#D85A30', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: '#993C1D', lineHeight: 1.4 }}>{step}</div>
              </div>
            ))}
          </div>

          {/* Copy number button */}
          <button
            onClick={copyNumber}
            style={{
              width: '100%', padding: '12px', border: '1.5px solid rgba(83,74,183,0.3)',
              borderRadius: 10, background: copied ? '#E1F5EE' : '#EEEDFE',
              cursor: 'pointer', fontSize: 14, fontWeight: 500,
              color: copied ? '#0F6E56' : '#534AB7', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✅ Merchant code copied!' : `📋 Copy merchant code: ${MERCHANT_NUMBER}`}
          </button>
        </div>

        {/* After payment instructions */}
        <div style={{ background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0F6E56', marginBottom: 8 }}>
            ✅ After making payment
          </div>
          <div style={{ fontSize: 13, color: '#1D9E75', lineHeight: 1.7 }}>
            Send your <strong>payment confirmation message</strong> (the SMS you receive after paying) to us via WhatsApp or email. We will activate your account within <strong>2 hours</strong> during business hours.
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a href="https://wa.me/256700000000" style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500, textDecoration: 'none' }}>
              💬 WhatsApp: +256 700 000 000 (placeholder)
            </a>
            <a href="mailto:support@distinction.ug" style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500, textDecoration: 'none' }}>
              📧 Email: support@distinction.ug (placeholder)
            </a>
          </div>
        </div>

        {/* Continue with limited */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '100%', padding: '13px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#888780', fontFamily: 'inherit', marginBottom: 12 }}
        >
          Continue with limited access (3 questions/day)
        </button>

        <button
          onClick={handleSignOut}
          style={{ width: '100%', padding: '11px', border: 'none', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#888780', fontFamily: 'inherit' }}
        >
          Sign out
        </button>

      </div>
    </div>
  )
}
