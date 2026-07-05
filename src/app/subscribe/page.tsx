'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SubscribePage() {
  const [profile, setProfile] = useState<{ full_name: string; is_subscribed: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [network, setNetwork] = useState<'MTN' | 'Airtel'>('MTN')
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const MERCHANT_NUMBER = '65950058'
  const MERCHANT_NAME = 'JOHN'

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserEmail(user.email || '')
    const { data } = await supabase
      .from('profiles')
      .select('full_name, is_subscribed')
      .eq('id', user.id)
      .single()
    if (data?.is_subscribed) { router.push('/dashboard'); return }
    setProfile(data)
    setLoading(false)
  }

  function copyNumber() {
    navigator.clipboard.writeText(MERCHANT_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function submitTransaction() {
    if (!transactionId.trim()) { setSubmitError('Please enter your transaction ID'); return }
    setSubmitting(true)
    setSubmitError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('payment_submissions').insert({
      user_id: user.id,
      full_name: profile?.full_name || '',
      email: userEmail,
      transaction_id: transactionId.trim(),
      amount: 8000,
      network,
      status: 'pending',
    })
    if (error) {
      setSubmitError('Could not submit. Please try again or contact us on WhatsApp.')
      setSubmitting(false)
      return
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
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
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #4C1D95)', padding: '24px 20px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎓</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Upgrade to Premium</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>Continue your child&apos;s PLE preparation without limits</div>
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>

        {/* Current plan notice */}
        <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B', marginBottom: 4 }}>⚠️ You are on the Limited Free Plan</div>
          <div style={{ fontSize: 13, color: '#854F0B', lineHeight: 1.6 }}>Only <strong>3 practice questions per day</strong>. Upgrade to unlock everything.</div>
        </div>

        {/* Features comparison */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>What you&apos;re missing</div>
          {[
            { feature: 'Practice questions', free: '3/day', premium: 'Unlimited', icon: '✏️' },
            { feature: 'AI Tutor', free: '❌', premium: '✅ 50/day', icon: '🤖' },
            { feature: 'Image upload', free: '❌', premium: '✅ 10/day', icon: '📷' },
            { feature: 'Mock exams', free: '❌', premium: '✅ All types', icon: '📝' },
            { feature: 'Revision mode', free: '❌', premium: '✅ Unlimited', icon: '📖' },
            { feature: 'Progress tracking', free: '❌', premium: '✅ Full', icon: '📊' },
            { feature: 'Student profiles', free: '1', premium: 'Up to 3', icon: '👦' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 6 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize: 16, width: 24 }}>{r.icon}</span>
              <div style={{ flex: 1, fontSize: 13 }}>{r.feature}</div>
              <div style={{ fontSize: 12, color: '#A32D2D', width: 55, textAlign: 'center' }}>{r.free}</div>
              <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500, width: 90, textAlign: 'right' }}>{r.premium}</div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #4C1D95)', borderRadius: 12, padding: 20, marginBottom: 20, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Premium subscription</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#F59E0B', marginBottom: 4 }}>UGX 8,000</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>per month · cancel any time</div>
        </div>

        {/* Payment instructions */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>📱 How to pay via Mobile Money</div>

          {/* Network selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['MTN', 'Airtel'] as const).map(n => (
              <button key={n} onClick={() => setNetwork(n)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                  background: network === n ? (n === 'MTN' ? '#FAEEDA' : '#FAECE7') : '#F1EFE8',
                  color: network === n ? (n === 'MTN' ? '#854F0B' : '#993C1D') : '#888780',
                  border: network === n ? (n === 'MTN' ? '2px solid #BA7517' : '2px solid #D85A30') : '2px solid transparent',
                }}>
                {n === 'MTN' ? '🟡 MTN MoMo' : '🔴 Airtel Money'}
              </button>
            ))}
          </div>

          {/* MTN steps */}
          {network === 'MTN' && (
            <div style={{ background: '#FAEEDA', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              {[
                'Dial *185# on your MTN line',
                'Select Pay with MoMo',
                `Enter merchant code: ${MERCHANT_NUMBER} (${MERCHANT_NAME})`,
                'Enter amount: 8000',
                'Enter your PIN to confirm',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 4 ? 8 : 0, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#BA7517', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.4 }}>{step}</div>
                </div>
              ))}
            </div>
          )}

          {/* Airtel steps */}
          {network === 'Airtel' && (
            <div style={{ background: '#FAECE7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              {[
                'Dial *185# on your Airtel line',
                'Select 1 — Make payment',
                'Select 3 — Pay merchant',
                `Enter merchant code: ${MERCHANT_NUMBER} (${MERCHANT_NAME})`,
                'Enter amount: 8000',
                'Enter your PIN to confirm',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 5 ? 8 : 0, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#D85A30', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: '#993C1D', lineHeight: 1.4 }}>{step}</div>
                </div>
              ))}
            </div>
          )}

          {/* Copy merchant code */}
          <button onClick={copyNumber}
            style={{ width: '100%', padding: '12px', border: '1.5px solid rgba(83,74,183,0.3)', borderRadius: 10, background: copied ? '#E1F5EE' : '#EEEDFE', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: copied ? '#0F6E56' : '#534AB7', fontFamily: 'inherit' }}>
            {copied ? '✅ Merchant code copied!' : `📋 Copy merchant code: ${MERCHANT_NUMBER}`}
          </button>
        </div>

        {/* Transaction ID submission */}
        {!submitted ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, border: '0.5px solid rgba(83,74,183,0.2)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B', marginBottom: 4 }}>✅ Paid? Confirm your payment here</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 14, lineHeight: 1.6 }}>
              Enter the <strong>transaction ID</strong> from the SMS you received after paying. Your account will be activated within 2 hours.
            </div>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 6 }}>Which network did you use?</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['MTN', 'Airtel'] as const).map(n => (
                <button key={n} onClick={() => setNetwork(n)}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: network === n ? '#EEEDFE' : '#F1EFE8', color: network === n ? '#534AB7' : '#888780' }}>
                  {n === 'MTN' ? '🟡 MTN' : '🔴 Airtel'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 6 }}>Transaction ID from your payment SMS</div>
            <input
              type="text"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value.toUpperCase())}
              placeholder="e.g. AB123456789"
              style={{ width: '100%', padding: '12px', border: '1.5px solid rgba(83,74,183,0.3)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />
            {submitError && <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 10 }}>{submitError}</div>}
            <button onClick={submitTransaction} disabled={submitting || !transactionId.trim()}
              style={{ width: '100%', padding: '13px', border: 'none', borderRadius: 10, background: submitting || !transactionId.trim() ? '#c5c0e8' : '#534AB7', color: '#fff', fontSize: 15, fontWeight: 700, cursor: submitting || !transactionId.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {submitting ? '⏳ Submitting...' : '✅ Submit Payment Confirmation'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F6E56', marginBottom: 8 }}>Payment submitted!</div>
            <div style={{ fontSize: 13, color: '#1D9E75', lineHeight: 1.7, marginBottom: 14 }}>
              We received transaction ID <strong>{transactionId}</strong>. Your account will be activated within <strong>2 hours</strong> (8am–8pm).
            </div>
            <a href="https://wa.me/256763441988"
              style={{ display: 'inline-block', background: '#25D366', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              💬 WhatsApp us if you need help
            </a>
          </div>
        )}

        <button onClick={() => router.push('/dashboard')}
          style={{ width: '100%', padding: '13px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#888780', fontFamily: 'inherit', marginBottom: 12 }}>
          Continue with limited access (3 questions/day)
        </button>
        <button onClick={handleSignOut}
          style={{ width: '100%', padding: '11px', border: 'none', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#888780', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

