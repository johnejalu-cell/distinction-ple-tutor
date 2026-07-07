'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  user_id: string
  full_name: string
  email: string
  transaction_id: string
  amount: number
  network: string
  status: string
  submitted_at: string
  activated_at: string | null
}

// Your admin email — only this email can access this page
const ADMIN_EMAIL = 'johnoejalu@yahoo.com'

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [counts, setCounts] = useState({ total: 0, pending: 0, activated: 0 })
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'activated'>('pending')
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'reject' | 'cancel' | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }
    await fetchSubmissions()
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function fetchSubmissions() {
    const { data } = await supabase
      .from('payment_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    const rows = data || []
    setSubmissions(rows)
    setCounts({
      total: rows.length,
      pending: rows.filter(r => r.status === 'pending').length,
      activated: rows.filter(r => r.status === 'activated').length,
    })
    setRefreshKey(k => k + 1)
  }

  async function activateAccount(submission: Submission) {
    setActivating(submission.id)
    try {
      // Activate their subscription using user_id from submission
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .update({
          is_subscribed: true,
          subscribed_at: new Date().toISOString(),
          subscription_expires_at: null,
        })
        .eq('id', submission.user_id)
        .select()

      if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)
      if (!profileRows || profileRows.length === 0) {
        throw new Error(
          'Profile update matched 0 rows. This almost always means a Row Level Security policy on the "profiles" table is blocking admin updates to other users\' rows. Check Supabase → Authentication → Policies → profiles → UPDATE policy.'
        )
      }

      // Mark submission as activated
      const { data: subRows, error: subError } = await supabase
        .from('payment_submissions')
        .update({ status: 'activated', activated_at: new Date().toISOString() })
        .eq('id', submission.id)
        .select()

      if (subError) throw new Error(`Submission update failed: ${subError.message}`)
      if (!subRows || subRows.length === 0) {
        throw new Error(
          'Submission status update matched 0 rows. This almost always means a Row Level Security policy on the "payment_submissions" table is blocking admin updates. Check Supabase → Authentication → Policies → payment_submissions → UPDATE policy.'
        )
      }

      await fetchSubmissions()
    } catch (err: any) {
      alert(err?.message || 'Error activating account. Check console.')
      console.error(err)
    } finally {
      setActivating(null)
    }
  }

  function requestConfirm(id: string, action: 'reject' | 'cancel') {
    setConfirmingId(id)
    setConfirmAction(action)
  }

  function cancelConfirm() {
    setConfirmingId(null)
    setConfirmAction(null)
  }

  async function rejectSubmission(id: string) {
    setProcessing(id)
    try {
      await supabase
        .from('payment_submissions')
        .update({ status: 'rejected' })
        .eq('id', id)
      await fetchSubmissions()
    } finally {
      setProcessing(null)
      cancelConfirm()
    }
  }

  async function cancelSubscription(submission: Submission) {
    setProcessing(submission.id)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_subscribed: false,
          subscription_expires_at: new Date().toISOString(),
        })
        .eq('id', submission.user_id)

      if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)

      const { error: subError } = await supabase
        .from('payment_submissions')
        .update({ status: 'cancelled' })
        .eq('id', submission.id)

      if (subError) throw new Error(`Submission update failed: ${subError.message}`)

      await fetchSubmissions()
    } catch (err: any) {
      alert(err?.message || 'Error cancelling subscription. Check console.')
      console.error(err)
    } finally {
      setProcessing(null)
      cancelConfirm()
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-UG', { dateStyle: 'short', timeStyle: 'short' })
  }

  const filtered = submissions.filter(s =>
    filter === 'all' ? true : s.status === filter
  )

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>⚙️</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading admin panel...</div>
      </div>
    )
  }



  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8F9FF' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #4C1D95)', padding: '20px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>⚙️ Admin Panel</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Get Ready 4 PLE — Payment Activations</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={fetchSubmissions}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
              🔄 Refresh
            </button>
            <button onClick={() => router.push('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
              🏠 Dashboard
            </button>
            <button onClick={handleSignOut}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div key={refreshKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Total', value: counts.total, color: '#fff' },
            { label: 'Pending', value: counts.pending, color: '#F59E0B' },
            { label: 'Activated', value: counts.activated, color: '#34D399' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['pending', 'activated', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
                background: filter === f ? '#534AB7' : '#F1EFE8',
                color: filter === f ? '#fff' : '#888780',
              }}>
              {f} {f === 'pending' && counts.pending > 0 ? `(${counts.pending})` : ''}
            </button>
          ))}
        </div>

        {/* Submissions list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888780' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14 }}>No {filter === 'all' ? '' : filter} submissions yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(s => (
              <div key={s.id} style={{
                background: '#fff', borderRadius: 12, padding: 16,
                border: `1.5px solid ${s.status === 'pending' ? 'rgba(245,158,11,0.4)' : s.status === 'activated' ? 'rgba(52,211,153,0.4)' : s.status === 'cancelled' ? 'rgba(186,117,23,0.4)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{s.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#888780' }}>{s.email}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: s.status === 'pending' ? '#FAEEDA' : s.status === 'activated' ? '#E1F5EE' : s.status === 'cancelled' ? '#FAEEDA' : '#FCEBEB',
                    color: s.status === 'pending' ? '#854F0B' : s.status === 'activated' ? '#0F6E56' : s.status === 'cancelled' ? '#854F0B' : '#A32D2D',
                    textTransform: 'uppercase',
                  }}>
                    {s.status}
                  </span>
                </div>

                {/* Transaction details */}
                <div style={{ background: '#F8F9FF', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#888780' }}>Transaction ID</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E1B4B' }}>{s.transaction_id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#888780' }}>Network</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.network}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#888780' }}>Amount</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>UGX {s.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#888780' }}>Submitted</span>
                    <span style={{ fontSize: 12, color: '#888780' }}>{formatDate(s.submitted_at)}</span>
                  </div>
                  {s.activated_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#888780' }}>Activated</span>
                      <span style={{ fontSize: 12, color: '#0F6E56' }}>{formatDate(s.activated_at)}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {s.status === 'pending' && confirmingId === s.id && confirmAction === 'reject' && (
                  <div>
                    <div style={{ fontSize: 13, color: '#A32D2D', fontWeight: 500, textAlign: 'center', marginBottom: 8 }}>
                      Reject this submission? This can't be undone.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={cancelConfirm}
                        style={{ flex: 1, padding: '11px', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 10, background: 'transparent', color: '#1a1a2e', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Keep Pending
                      </button>
                      <button
                        onClick={() => rejectSubmission(s.id)}
                        disabled={processing === s.id}
                        style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#A32D2D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: processing === s.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {processing === s.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {s.status === 'pending' && !(confirmingId === s.id && confirmAction === 'reject') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => activateAccount(s)}
                      disabled={activating === s.id}
                      style={{
                        flex: 2, padding: '11px', border: 'none', borderRadius: 10,
                        background: activating === s.id ? '#9b93d4' : '#534AB7',
                        color: '#fff', fontSize: 14, fontWeight: 600,
                        cursor: activating === s.id ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}>
                      {activating === s.id ? '⏳ Activating...' : '✅ Activate Account'}
                    </button>
                    <button
                      onClick={() => requestConfirm(s.id, 'reject')}
                      style={{ flex: 1, padding: '11px', border: '1.5px solid #A32D2D', borderRadius: 10, background: 'transparent', color: '#A32D2D', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ❌ Reject
                    </button>
                  </div>
                )}

                {s.status === 'activated' && confirmingId === s.id && confirmAction === 'cancel' && (
                  <div>
                    <div style={{ fontSize: 13, color: '#A32D2D', fontWeight: 500, textAlign: 'center', marginBottom: 8 }}>
                      Cancel this subscription? Access will be revoked immediately.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={cancelConfirm}
                        style={{ flex: 1, padding: '11px', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 10, background: 'transparent', color: '#1a1a2e', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Keep Active
                      </button>
                      <button
                        onClick={() => cancelSubscription(s)}
                        disabled={processing === s.id}
                        style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#A32D2D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: processing === s.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {processing === s.id ? 'Cancelling...' : 'Confirm Cancel'}
                      </button>
                    </div>
                  </div>
                )}

                {s.status === 'activated' && !(confirmingId === s.id && confirmAction === 'cancel') && (
                  <div>
                    <div style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500, textAlign: 'center', padding: '8px 0 10px' }}>
                      ✅ Account is active
                    </div>
                    <button
                      onClick={() => requestConfirm(s.id, 'cancel')}
                      style={{ width: '100%', padding: '9px', border: '1.5px solid #A32D2D', borderRadius: 10, background: 'transparent', color: '#A32D2D', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancel Subscription
                    </button>
                  </div>
                )}

                {s.status === 'cancelled' && (
                  <div style={{ fontSize: 13, color: '#854F0B', fontWeight: 500, textAlign: 'center', padding: '8px 0' }}>
                    🚫 Subscription cancelled
                  </div>
                )}

                {s.status === 'rejected' && (
                  <div style={{ fontSize: 13, color: '#A32D2D', fontWeight: 500, textAlign: 'center', padding: '8px 0' }}>
                    ❌ Rejected
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

