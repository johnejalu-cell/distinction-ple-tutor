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
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'activated'>('pending')
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      setUnauthorized(true)
      setLoading(false)
      return
    }
    await fetchSubmissions()
    setLoading(false)
  }

  async function fetchSubmissions() {
    const { data } = await supabase
      .from('payment_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    setSubmissions(data || [])
    setRefreshKey(k => k + 1)
  }

  async function activateAccount(submission: Submission) {
    setActivating(submission.id)
    try {
      // Activate their subscription using user_id from submission
      const { error } = await supabase
        .from('profiles')
        .update({
          is_subscribed: true,
          subscribed_at: new Date().toISOString(),
          subscription_expires_at: null,
        })
        .eq('id', submission.user_id)

      if (error) throw error

      // 3. Mark submission as activated
      await supabase
        .from('payment_submissions')
        .update({ status: 'activated', activated_at: new Date().toISOString() })
        .eq('id', submission.id)

      await fetchSubmissions()
    } catch (err) {
      alert('Error activating account. Check console.')
      console.error(err)
    } finally {
      setActivating(null)
    }
  }

  async function rejectSubmission(id: string) {
    await supabase
      .from('payment_submissions')
      .update({ status: 'rejected' })
      .eq('id', id)
    await fetchSubmissions()
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

  if (unauthorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Access denied</div>
        <div style={{ fontSize: 14, color: '#888780', textAlign: 'center' }}>This page is only accessible to administrators.</div>
        <button onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          Back to dashboard
        </button>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchSubmissions}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
              🔄 Refresh
            </button>
            <button onClick={() => router.push('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Stats */}
        <div key={refreshKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Total', value: submissions.length, color: '#fff' },
            { label: 'Pending', value: pendingCount, color: '#F59E0B' },
            { label: 'Activated', value: submissions.filter(s => s.status === 'activated').length, color: '#34D399' },
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
              {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
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
                border: `1.5px solid ${s.status === 'pending' ? 'rgba(245,158,11,0.4)' : s.status === 'activated' ? 'rgba(52,211,153,0.4)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{s.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#888780' }}>{s.email}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: s.status === 'pending' ? '#FAEEDA' : s.status === 'activated' ? '#E1F5EE' : '#FCEBEB',
                    color: s.status === 'pending' ? '#854F0B' : s.status === 'activated' ? '#0F6E56' : '#A32D2D',
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
                {s.status === 'pending' && (
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
                      onClick={() => rejectSubmission(s.id)}
                      style={{ flex: 1, padding: '11px', border: '1.5px solid #A32D2D', borderRadius: 10, background: 'transparent', color: '#A32D2D', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ❌ Reject
                    </button>
                  </div>
                )}

                {s.status === 'activated' && (
                  <div style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500, textAlign: 'center', padding: '8px 0' }}>
                    ✅ Account is active
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

