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

export default function DashboardPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [masteries, setMasteries] = useState<SubjectMastery[]>([])
  const [loading, setLoading] = useState(true)
  const [daysToExam, setDaysToExam] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    // Calculate days to PLE (typically October)
    const now = new Date()
    const ple = new Date(now.getFullYear(), 9, 15) // Oct 15
    if (ple < now) ple.setFullYear(now.getFullYear() + 1)
    setDaysToExam(Math.ceil((ple.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Get first student belonging to this parent
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('parent_id', user.id)
      .eq('is_active', true)
      .order('created_at')
      .limit(1)

    if (!students || students.length === 0) {
      router.push('/onboarding')
      return
    }

    setStudent(students[0])

    // Get subject mastery from view
    const { data: m } = await supabase
      .from('v_subject_mastery')
      .select('*')
      .eq('student_id', students[0].id)

    setMasteries(m || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function getMasteryForSubject(code: string) {
    const m = masteries.find(x => x.subject_code === code)
    return m ? Math.round(m.avg_mastery_pct) : 0
  }

  const subjects = [
    { code: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#BA7517', bg: '#FAEEDA', desc: 'Word problems, fractions, ratio' },
    { code: 'english',     name: 'English',     icon: '📖', color: '#1D9E75', bg: '#E1F5EE', desc: 'Grammar, comprehension, vocab' },
    { code: 'science',     name: 'Science',     icon: '🔬', color: '#534AB7', bg: '#EEEDFE', desc: 'Living things, energy, environment' },
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
      <div style={{ background: '#534AB7', padding: '28px 20px 24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4, position: 'relative' }}>Welcome back,</div>
        <div style={{ fontSize: 23, fontWeight: 500, marginBottom: 3, position: 'relative' }}>
          {student?.avatar_emoji} {student?.full_name}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, position: 'relative' }}>
          PLE {student?.ple_year} · {daysToExam} days to go
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 14, background: 'rgba(255,255,255,0.15)',
          borderRadius: 20, padding: '6px 14px', position: 'relative',
        }}>
          <span style={{ fontSize: 15 }}>🔥</span>
          <span style={{ fontSize: 13 }}>
            {student?.current_streak_days || 0}-day streak
            {(student?.current_streak_days || 0) > 0 ? ' — keep going!' : ' — start today!'}
          </span>
        </div>
      </div>

      {/* Daily challenge */}
      <div className="section-label">Today&apos;s Challenge</div>
      <div
        onClick={() => router.push('/session?subject=mathematics')}
        style={{
          margin: '0 16px 4px',
          background: '#E1F5EE',
          border: '0.5px solid rgba(29,158,117,0.25)',
          borderRadius: 12, padding: 16, cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
          ⚡ Daily Challenge
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#0F6E56', marginBottom: 3 }}>
          Maths Word Problems
        </div>
        <div style={{ fontSize: 13, color: '#1D9E75', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Fractions &amp; Ratios · 5 questions</span>
          <span style={{ fontSize: 18 }}>→</span>
        </div>
      </div>

      {/* Subjects */}
      <div className="section-label">Subjects</div>
      <div style={{ padding: '0 16px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Maths - featured full width */}
        <div
          onClick={() => router.push('/session?subject=mathematics')}
          style={{
            gridColumn: 'span 2', background: '#fff',
            border: '0.5px solid rgba(0,0,0,0.10)',
            borderRadius: 12, padding: 15, cursor: 'pointer', position: 'relative',
          }}
        >
          <span style={{
            position: 'absolute', top: 10, right: 10,
            background: '#FAEEDA', color: '#854F0B',
            fontSize: 10, padding: '3px 7px', borderRadius: 20, fontWeight: 500,
          }}>⭐ Focus</span>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🔢</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>Mathematics</div>
          <div style={{ fontSize: 11, color: '#888780', marginBottom: 8 }}>Word problems, fractions, ratio</div>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${getMasteryForSubject('mathematics')}%`, background: '#BA7517' }} />
          </div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{getMasteryForSubject('mathematics')}% mastery</div>
        </div>

        {subjects.slice(1).map(s => (
          <div
            key={s.code}
            onClick={() => router.push(`/session?subject=${s.code}`)}
            style={{
              background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)',
              borderRadius: 12, padding: 15, cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#888780', marginBottom: 8 }}>{s.desc}</div>
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: `${getMasteryForSubject(s.code)}%`, background: s.color }} />
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{getMasteryForSubject(s.code)}%</div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="section-label">This Week</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '0 16px 16px' }}>
        {[
          { label: 'Points', value: student?.total_points || 0, color: '#BA7517' },
          { label: 'Streak', value: `${student?.current_streak_days || 0}d`, color: '#1D9E75' },
          { label: 'Subjects', value: subjects.length, color: '#534AB7' },
        ].map(s => (
          <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn active" onClick={() => router.push('/dashboard')}>
          <span style={{ fontSize: 22 }}>🏠</span>Home
        </button>
        <button className="nav-btn" onClick={() => router.push('/session?subject=mathematics')}>
          <span style={{ fontSize: 22 }}>✏️</span>Practice
        </button>
        <button className="nav-btn" onClick={() => router.push('/progress')}>
          <span style={{ fontSize: 22 }}>📊</span>Progress
        </button>
        <button className="nav-btn" onClick={() => router.push('/parent')}>
          <span style={{ fontSize: 22 }}>👨‍👩‍👧</span>Parent
        </button>
      </nav>
    </div>
  )
}
