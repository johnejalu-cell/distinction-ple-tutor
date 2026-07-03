'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  full_name: string
  total_points: number
  current_streak_days: number
  avatar_emoji: string
  ple_year: number
}

interface SubjectMastery {
  subject_code: string
  subject_name: string
  icon_emoji: string
  avg_mastery_pct: number
}

interface AccessStatus {
  hasFullAccess: boolean
  isTrial: boolean
  isSubscribed: boolean
  trialHoursLeft: number
}

export default function DashboardPage() {
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [masteries, setMasteries] = useState<SubjectMastery[]>([])
  const [loading, setLoading] = useState(true)
  const [daysToExam, setDaysToExam] = useState(0)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [weakSubtopic, setWeakSubtopic] = useState<{ subject: string; subjectCode: string; subtopic: string } | null>(null)
  const [access, setAccess] = useState<AccessStatus>({
    hasFullAccess: true,
    isTrial: true,
    isSubscribed: false,
    trialHoursLeft: 24,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    const now = new Date()
    const ple = new Date(now.getFullYear(), 9, 15)
    if (ple < now) ple.setFullYear(now.getFullYear() + 1)
    setDaysToExam(Math.ceil((ple.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check access status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_subscribed, trial_started_at, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (profile) {
      const now = new Date()
      const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null
      const hoursElapsed = trialStart ? (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60) : 999
      const trialActive = hoursElapsed < 24
      const trialHoursLeft = trialActive ? Math.ceil(24 - hoursElapsed) : 0
      const subscriptionActive = profile.is_subscribed &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > now)
      const hasFullAccess = trialActive || subscriptionActive

      setAccess({
        hasFullAccess,
        isTrial: trialActive,
        isSubscribed: subscriptionActive,
        trialHoursLeft,
      })
    }

    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('parent_id', user.id)
      .eq('is_active', true)
      .order('created_at')

    if (!students || students.length === 0) {
      router.push('/onboarding')
      return
    }

    setAllStudents(students)
    const active = student
      ? students.find(s => s.id === student.id) || students[0]
      : students[0]
    setStudent(active)
    await loadMastery(active.id)
    await loadWeakSubtopic(active.id)
    setLoading(false)
  }

  async function loadMastery(studentId: string) {
    const { data: m } = await supabase
      .from('v_subject_mastery')
      .select('*')
      .eq('student_id', studentId)
    setMasteries(m || [])
  }

  async function loadWeakSubtopic(studentId: string) {
    const { data } = await supabase
      .from('v_weak_subtopics')
      .select('subject_name, subtopic_name')
      .eq('student_id', studentId)
      .order('mastery_pct', { ascending: true })
      .limit(1)

    if (data && data.length > 0) {
      const w = data[0]
      const subjectName = w.subject_name || ''
      let subjectCode = 'mathematics'
      if (subjectName.toLowerCase().includes('english')) subjectCode = 'english'
      else if (subjectName.toLowerCase().includes('science')) subjectCode = 'science'
      setWeakSubtopic({
        subject: subjectName,
        subjectCode,
        subtopic: w.subtopic_name || '',
      })
    }
  }

  async function switchStudent(s: Student) {
    setStudent(s)
    setShowSwitcher(false)
    setMasteries([])
    await loadMastery(s.id)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function getMastery(code: string) {
    const m = masteries.find(x => x.subject_code === code)
    return m ? Math.round(m.avg_mastery_pct) : 0
  }

  function handleLockedFeature() {
    router.push('/subscribe')
  }

  const subjects = [
    { code: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#BA7517', desc: 'Word problems, fractions, ratio' },
    { code: 'english', name: 'English', icon: '📖', color: '#1D9E75', desc: 'Grammar, comprehension, vocab' },
    { code: 'science', name: 'Science', icon: '🔬', color: '#534AB7', desc: 'Living things, energy, environment' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🎓</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#534AB7', padding: '20px 20px 22px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />

        {/* Sign out */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, position: 'relative' }}>
          <button onClick={handleSignOut}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>

        {/* Student info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
            {student?.avatar_emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Welcome back,</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{student?.full_name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>PLE {student?.ple_year} · {daysToExam} days to go</div>
          </div>
          {allStudents.length > 1 && (
            <button onClick={() => setShowSwitcher(s => !s)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              Switch ▾
            </button>
          )}
        </div>

        {/* Switcher dropdown */}
        {showSwitcher && allStudents.length > 1 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 8, position: 'relative', zIndex: 10 }}>
            {allStudents.map(s => (
              <button key={s.id} onClick={() => switchStudent(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', background: s.id === student?.id ? '#EEEDFE' : 'transparent', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#1a1a2e', textAlign: 'left' }}>
                <span style={{ fontSize: 20 }}>{s.avatar_emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: '#888780' }}>PLE {s.ple_year} · {s.total_points} pts</div>
                </div>
                {s.id === student?.id && <span style={{ marginLeft: 'auto', color: '#534AB7', fontSize: 16 }}>✓</span>}
              </button>
            ))}
            <button onClick={() => { setShowSwitcher(false); router.push('/onboarding') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#534AB7', fontSize: 13, fontWeight: 500 }}>
              + Add another child
            </button>
          </div>
        )}

        {/* Streak */}
        {!showSwitcher && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 13px', position: 'relative' }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 13 }}>
              {student?.current_streak_days || 0}-day streak
              {(student?.current_streak_days || 0) > 0 ? ' — keep going!' : ' — start today!'}
            </span>
          </div>
        )}
      </div>

      {/* ── ACCESS BANNERS ── */}

      {/* Trial active banner */}
      {access.isTrial && access.hasFullAccess && (
        <div style={{ background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: '#0F6E56' }}>
            🎉 Free trial — <strong>{access.trialHoursLeft}h left</strong>. Full access enabled.
          </div>
          <button onClick={() => router.push('/subscribe')}
            style={{ fontSize: 12, fontWeight: 500, color: '#0F6E56', background: 'none', border: '1px solid #1D9E75', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Upgrade
          </button>
        </div>
      )}

      {/* Limited access banner */}
      {!access.hasFullAccess && !access.isSubscribed && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B', marginBottom: 4 }}>
            ⚠️ You are on the Limited Free Plan
          </div>
          <div style={{ fontSize: 12, color: '#854F0B', marginBottom: 8, lineHeight: 1.5 }}>
            Only <strong>3 practice questions per day</strong>. AI Tutor, Mock Exams and Progress tracking require a subscription.
          </div>
          <button onClick={() => router.push('/subscribe')}
            style={{ background: '#BA7517', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Subscribe — UGX 25,000/month →
          </button>
        </div>
      )}

      {/* Today's challenge */}
      <div className="section-label">Today&apos;s Challenge</div>
      <div onClick={() => router.push(\`/session?subject=\${weakSubtopic ? weakSubtopic.subjectCode : 'mathematics'}\`)}
        style={{ margin: '0 16px 8px', background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.25)', borderRadius: 12, padding: 16, cursor: 'pointer' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>⚡ Daily Challenge</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#0F6E56', marginBottom: 3 }}>
          {weakSubtopic ? weakSubtopic.subject : 'Mathematics'}
        </div>
        <div style={{ fontSize: 13, color: '#1D9E75', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {weakSubtopic
              ? \`Focus: \${weakSubtopic.subtopic} · \${access.hasFullAccess ? '5 questions' : '3 questions'}\`
              : access.hasFullAccess ? 'Start practising · 5 questions' : 'Limited · 3 questions only'
            }
          </span>
          <span style={{ fontSize: 18 }}>→</span>
        </div>
      </div>

      {/* Mock + AI Tutor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 16px 8px' }}>

        {/* Mock exam */}
        <div
          onClick={() => access.hasFullAccess ? router.push('/mock') : handleLockedFeature()}
          style={{ background: access.hasFullAccess ? '#FAECE7' : '#F1EFE8', border: `0.5px solid ${access.hasFullAccess ? 'rgba(216,90,48,0.25)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, padding: 14, cursor: 'pointer', position: 'relative' }}>
          {!access.hasFullAccess && (
            <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>🔒</div>
          )}
          <div style={{ fontSize: 20, marginBottom: 6 }}>📝</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: access.hasFullAccess ? '#993C1D' : '#888780', marginBottom: 3 }}>Mock Exam</div>
          <div style={{ fontSize: 11, color: access.hasFullAccess ? '#D85A30' : '#888780', lineHeight: 1.4 }}>
            {access.hasFullAccess ? 'Timed · PLE style · Grade' : 'Premium only'}
          </div>
        </div>

        {/* AI Tutor */}
        <div
          onClick={() => access.hasFullAccess ? router.push('/tutor') : handleLockedFeature()}
          style={{ background: access.hasFullAccess ? '#EEEDFE' : '#F1EFE8', border: `0.5px solid ${access.hasFullAccess ? 'rgba(83,74,183,0.25)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, padding: 14, cursor: 'pointer', position: 'relative' }}>
          {!access.hasFullAccess && (
            <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>🔒</div>
          )}
          <div style={{ fontSize: 20, marginBottom: 6 }}>🤖</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: access.hasFullAccess ? '#3C3489' : '#888780', marginBottom: 3 }}>AI Tutor</div>
          <div style={{ fontSize: 11, color: access.hasFullAccess ? '#534AB7' : '#888780', lineHeight: 1.4 }}>
            {access.hasFullAccess ? 'Ask anything · Upload photos' : 'Premium only'}
          </div>
        </div>
      </div>

      {/* Revision Mode card */}
      <div
        onClick={() => access.hasFullAccess ? router.push('/revision/select') : handleLockedFeature()}
        style={{ margin: '0 16px 8px', background: access.hasFullAccess ? '#FAEEDA' : '#F1EFE8', border: `0.5px solid ${access.hasFullAccess ? 'rgba(186,117,23,0.25)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', position: 'relative' }}>
        {!access.hasFullAccess && (
          <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 16 }}>🔒</div>
        )}
        <div style={{ fontSize: 11, fontWeight: 600, color: access.hasFullAccess ? '#854F0B' : '#888780', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>📖 Revision Mode</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: access.hasFullAccess ? '#854F0B' : '#888780', marginBottom: 3 }}>
          Unlimited practice for exam prep
        </div>
        <div style={{ fontSize: 13, color: access.hasFullAccess ? '#BA7517' : '#888780', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{access.hasFullAccess ? 'No limits · Pick any subject' : 'Premium only'}</span>
          <span style={{ fontSize: 18 }}>{access.hasFullAccess ? '→' : ''}</span>
        </div>
      </div>

      {/* Subjects */}
      <div className="section-label">Subjects</div>
      <div style={{ padding: '0 16px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div onClick={() => router.push('/session?subject=mathematics')}
          style={{ gridColumn: 'span 2', background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 15, cursor: 'pointer', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 10, right: 10, background: '#FAEEDA', color: '#854F0B', fontSize: 10, padding: '3px 7px', borderRadius: 20, fontWeight: 500 }}>⭐ Focus</span>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🔢</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>Mathematics</div>
          <div style={{ fontSize: 11, color: '#888780', marginBottom: 8 }}>Word problems, fractions, ratio</div>
          <div className="prog-bar"><div className="prog-fill" style={{ width: `${getMastery('mathematics')}%`, background: '#BA7517' }} /></div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{getMastery('mathematics')}% mastery</div>
        </div>

        {subjects.slice(1).map(s => (
          <div key={s.code} onClick={() => router.push(`/session?subject=${s.code}`)}
            style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 15, cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 8 }}>{s.desc}</div>
            <div className="prog-bar"><div className="prog-fill" style={{ width: `${getMastery(s.code)}%`, background: s.color }} /></div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{getMastery(s.code)}%</div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="section-label">This Week</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '0 16px 16px' }}>
        {[
          { label: 'Points', value: student?.total_points || 0, color: '#BA7517' },
          { label: 'Streak', value: `${student?.current_streak_days || 0}d`, color: '#1D9E75' },
          { label: 'Subjects', value: 3, color: '#534AB7' },
        ].map(s => (
          <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* About link */}
      <div style={{ textAlign: 'center', padding: '12px 16px 4px' }}>
        <a href="/" style={{ fontSize: 12, color: '#888780', textDecoration: 'none' }}>
          🎓 About Get Ready 4 PLE
        </a>
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn active" onClick={() => router.push('/dashboard')}>
          <span style={{ fontSize: 20 }}>🏠</span>Home
        </button>
        <button className="nav-btn" onClick={() => router.push('/session?subject=mathematics')}>
          <span style={{ fontSize: 20 }}>✏️</span>Practice
        </button>
        <button className="nav-btn" onClick={() => access.hasFullAccess ? router.push('/tutor') : handleLockedFeature()}>
          <span style={{ fontSize: 20 }}>{access.hasFullAccess ? '🤖' : '🔒'}</span>Tutor
        </button>
        <button className="nav-btn" onClick={() => access.hasFullAccess ? router.push('/mock') : handleLockedFeature()}>
          <span style={{ fontSize: 20 }}>{access.hasFullAccess ? '📝' : '🔒'}</span>Mock
        </button>
        <button className="nav-btn" onClick={() => access.hasFullAccess ? router.push('/progress') : handleLockedFeature()}>
          <span style={{ fontSize: 20 }}>{access.hasFullAccess ? '📊' : '🔒'}</span>Progress
        </button>
      </nav>
    </div>
  )
}

