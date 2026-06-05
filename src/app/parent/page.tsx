'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  full_name: string
  avatar_emoji: string
  school_name: string | null
  district: string | null
  ple_year: number
  total_points: number
  current_streak_days: number
  last_active_date: string | null
}

interface SubjectMastery {
  subject_code: string
  subject_name: string
  icon_emoji: string
  avg_mastery_pct: number
  mastery_band: string
}

interface WeakSubtopic {
  subject_name: string
  subtopic_name: string
  mastery_pct: number
}

export default function ParentPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [masteries, setMasteries] = useState<SubjectMastery[]>([])
  const [weakTopics, setWeakTopics] = useState<WeakSubtopic[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [parentName, setParentName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Parent profile
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    if (profile) setParentName(profile.full_name)

    // All students
    const { data: studs } = await supabase
      .from('students').select('*').eq('parent_id', user.id).eq('is_active', true)
    if (!studs?.length) { router.push('/onboarding'); return }
    setStudents(studs)
    setSelected(studs[0])
    await loadStudentData(studs[0].id)
    setLoading(false)
  }

  async function loadStudentData(studentId: string) {
    // Mastery
    const { data: m } = await supabase
      .from('v_subject_mastery').select('*').eq('student_id', studentId)
    setMasteries(m || [])

    // Weak topics
    const { data: w } = await supabase
      .from('v_weak_subtopics').select('*').eq('student_id', studentId).limit(3)
    setWeakTopics(w || [])

    // Sessions stats
    const { data: allSess } = await supabase
      .from('sessions').select('id, score_pct, started_at').eq('student_id', studentId)
    if (allSess) {
      setTotalSessions(allSess.length)
      const week = new Date(); week.setDate(week.getDate() - 7)
      const weekS = allSess.filter(s => new Date(s.started_at) > week)
      setWeekSessions(weekS.length)
      const scored = allSess.filter(s => s.score_pct)
      setAvgScore(scored.length ? Math.round(scored.reduce((a, s) => a + (s.score_pct || 0), 0) / scored.length) : 0)
    }
  }

  async function switchStudent(s: Student) {
    setSelected(s)
    await loadStudentData(s.id)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function subjectColor(code: string) {
    return code === 'mathematics' ? '#BA7517' : code === 'english' ? '#1D9E75' : '#534AB7'
  }

  function lastActiveText(date: string | null) {
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today ✅'
    if (diff === 1) return 'Yesterday'
    if (diff <= 7) return `${diff} days ago`
    return `${Math.floor(diff / 7)} weeks ago`
  }

  function projectedGrade(pct: number) {
    if (pct >= 91) return 'D1'
    if (pct >= 81) return 'D2'
    if (pct >= 71) return 'D3'
    if (pct >= 61) return 'D4'
    if (pct >= 51) return 'D5'
    return 'D6+'
  }

  const overallPct = masteries.length
    ? Math.round(masteries.reduce((a, m) => a + m.avg_mastery_pct, 0) / masteries.length)
    : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>👨‍👩‍👧</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="topbar">
        <button className="topbar-back" onClick={() => router.push('/dashboard')}>←</button>
        <div className="topbar-title">Parent Dashboard</div>
        <button
          onClick={handleSignOut}
          style={{ fontSize: 12, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Sign out
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Parent greeting */}
        <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 16 }}>
          Welcome, <strong>{parentName}</strong>
        </div>

        {/* Student selector (if multiple) */}
        {students.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => switchStudent(s)}
                style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, fontFamily: 'inherit',
                  border: '1.5px solid',
                  borderColor: selected?.id === s.id ? '#534AB7' : 'rgba(0,0,0,0.12)',
                  background: selected?.id === s.id ? '#EEEDFE' : '#fff',
                  color: selected?.id === s.id ? '#3C3489' : '#5F5E5A',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500,
                }}
              >
                {s.avatar_emoji} {s.full_name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Student card */}
        {selected && (
          <div style={{ background: '#EEEDFE', borderRadius: 12, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {selected.avatar_emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{selected.full_name}</div>
              <div style={{ fontSize: 13, color: '#5F5E5A' }}>
                P7 · {selected.school_name || 'School not set'}{selected.district ? ` · ${selected.district}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>
                Last active: {lastActiveText(selected.last_active_date)}
              </div>
            </div>
          </div>
        )}

        {/* Weekly summary */}
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>This Week</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
          {[
            { label: 'Sessions', value: weekSessions, color: '#534AB7' },
            { label: 'Avg score', value: `${avgScore}%`, color: avgScore >= 60 ? '#1D9E75' : '#D85A30' },
            { label: 'Points', value: selected?.total_points || 0, color: '#BA7517' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subject readiness */}
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Subject Readiness</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { code: 'mathematics', name: 'Mathematics', icon: '🔢' },
            { code: 'english',     name: 'English',     icon: '📖' },
            { code: 'science',     name: 'Science',     icon: '🔬' },
          ].map(s => {
            const m = masteries.find(x => x.subject_code === s.code)
            const pct = m ? Math.round(m.avg_mastery_pct) : 0
            const color = subjectColor(s.code)
            return (
              <div key={s.code} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{s.icon} {s.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color }}>{pct}%</span>
                </div>
                <div className="prog-bar" style={{ marginBottom: 6 }}>
                  <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div style={{ fontSize: 11, color: '#888780' }}>
                  {pct === 0 ? 'Not started yet' : pct < 50 ? 'Needs more practice' : pct < 70 ? 'Making progress' : pct < 85 ? 'Almost ready' : 'Distinction ready!'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall grade projection */}
        <div style={{ background: '#534AB7', borderRadius: 12, padding: 16, marginBottom: 24, color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Projected PLE Grade</div>
          <div style={{ fontSize: 48, fontWeight: 500, marginBottom: 4 }}>{projectedGrade(overallPct)}</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Based on {overallPct}% overall mastery
            {overallPct >= 81 ? ' — Distinction track! 🏆' : overallPct >= 61 ? ' — Good progress' : ' — Needs more work'}
          </div>
        </div>

        {/* Weak areas alert */}
        {weakTopics.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Focus Areas for Parents</div>
            <div style={{ background: '#FAECE7', border: '0.5px solid rgba(216,90,48,0.25)', borderRadius: 12, padding: 14, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#993C1D', marginBottom: 10 }}>
                ⚠️ Your child needs extra help with:
              </div>
              {weakTopics.map((w, i) => (
                <div key={i} style={{ marginBottom: i < weakTopics.length - 1 ? 8 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 13, color: '#993C1D' }}>
                      {w.subject_name}: {w.subtopic_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#D85A30', fontWeight: 500 }}>{Math.round(w.mastery_pct)}%</div>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${w.mastery_pct}%`, background: '#D85A30' }} />
                  </div>
                </div>
              ))}
              <button
                className="btn-primary"
                style={{ marginTop: 14, background: '#D85A30' }}
                onClick={() => router.push('/session?subject=science')}
              >
                Practise weak areas now
              </button>
            </div>
          </>
        )}

        {/* Tips for parents */}
        <div style={{ background: '#E1F5EE', borderRadius: 12, padding: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0F6E56', marginBottom: 8 }}>
            💡 Tips to support {selected?.full_name.split(' ')[0]}
          </div>
          <div style={{ fontSize: 13, color: '#1D9E75', lineHeight: 1.7 }}>
            • Encourage <strong>30 minutes daily</strong> — short sessions beat long cramming<br />
            • Ask about what they learned after each session<br />
            • Celebrate streaks and point milestones<br />
            • Focus on weak areas {selected?.current_streak_days ? `— ${selected.current_streak_days}-day streak is great!` : '— start a daily habit'}
          </div>
        </div>

        {/* Add another student */}
        <button
          className="btn-secondary"
          onClick={() => router.push('/onboarding')}
          style={{ marginBottom: 16 }}
        >
          + Add another child
        </button>

      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => router.push('/dashboard')}><span style={{ fontSize: 22 }}>🏠</span>Home</button>
        <button className="nav-btn" onClick={() => router.push('/session?subject=mathematics')}><span style={{ fontSize: 22 }}>✏️</span>Practice</button>
        <button className="nav-btn" onClick={() => router.push('/progress')}><span style={{ fontSize: 22 }}>📊</span>Progress</button>
        <button className="nav-btn active" onClick={() => router.push('/parent')}><span style={{ fontSize: 22 }}>👨‍👩‍👧</span>Parent</button>
      </nav>
    </div>
  )
}
