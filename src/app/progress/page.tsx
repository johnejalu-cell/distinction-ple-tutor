'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SubjectMastery {
  subject_code: string
  subject_name: string
  icon_emoji: string
  avg_mastery_pct: number
  mastery_band: string
  subtopics_practiced: number
  subtopics_distinction: number
}

interface WeakSubtopic {
  subject_name: string
  topic_name: string
  subtopic_name: string
  mastery_pct: number
  mastery_band: string
  total_attempts: number
}

interface RecentSession {
  id: string
  session_type: string
  started_at: string
  score_pct: number
  total_questions: number
  correct_count: number
  subjects: { name: string; icon_emoji: string } | null
}

export default function ProgressPage() {
  const [masteries, setMasteries] = useState<SubjectMastery[]>([])
  const [weakTopics, setWeakTopics] = useState<WeakSubtopic[]>([])
  const [sessions, setSessions] = useState<RecentSession[]>([])
  const [studentName, setStudentName] = useState('')
  const [totalPoints, setTotalPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, total_points, current_streak_days')
      .eq('parent_id', user.id)
      .limit(1)

    if (!students?.length) { router.push('/onboarding'); return }
    const student = students[0]
    setStudentName(student.full_name)
    setTotalPoints(student.total_points)
    setStreak(student.current_streak_days)

    // Subject mastery
    const { data: m } = await supabase
      .from('v_subject_mastery')
      .select('*')
      .eq('student_id', student.id)
    setMasteries(m || [])

    // Weak subtopics
    const { data: w } = await supabase
      .from('v_weak_subtopics')
      .select('*')
      .eq('student_id', student.id)
      .limit(5)
    setWeakTopics(w || [])

    // Recent sessions
    const { data: s } = await supabase
      .from('sessions')
      .select('id, session_type, started_at, score_pct, total_questions, correct_count, subjects(name, icon_emoji)')
      .eq('student_id', student.id)
      .order('started_at', { ascending: false })
      .limit(6)
    setSessions((s as unknown as RecentSession[]) || [])

    setLoading(false)
  }

  function bandColor(band: string) {
    const map: Record<string, string> = {
      distinction: '#1D9E75', mastered: '#1D9E75',
      developing: '#BA7517', learning: '#D85A30',
      not_started: '#888780',
    }
    return map[band] || '#888780'
  }

  function bandBg(band: string) {
    const map: Record<string, string> = {
      distinction: '#E1F5EE', mastered: '#E1F5EE',
      developing: '#FAEEDA', learning: '#FAECE7',
      not_started: '#F1EFE8',
    }
    return map[band] || '#F1EFE8'
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff} days ago`
  }

  const subjects = [
    { code: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#BA7517' },
    { code: 'english',     name: 'English',     icon: '📖', color: '#1D9E75' },
    { code: 'science',     name: 'Science',     icon: '🔬', color: '#534AB7' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading progress...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="topbar">
        <button className="topbar-back" onClick={() => router.push('/dashboard')}>←</button>
        <div className="topbar-title">My Progress</div>
        <div style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
          ⭐ {totalPoints}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
          {[
            { label: 'Points', value: totalPoints, color: '#BA7517' },
            { label: 'Streak', value: `${streak}d 🔥`, color: '#D85A30' },
            { label: 'Sessions', value: sessions.length, color: '#534AB7' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subject mastery */}
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, color: '#1a1a2e' }}>Subject Performance</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {subjects.map(s => {
            const m = masteries.find(x => x.subject_code === s.code)
            const pct = m ? Math.round(m.avg_mastery_pct) : 0
            const band = m?.mastery_band || 'not_started'
            return (
              <div key={s.code} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: 4 }}>{s.icon} {s.name}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: s.color, marginBottom: 6 }}>{pct}%</div>
                <div className="prog-bar" style={{ marginBottom: 6 }}>
                  <div className="prog-fill" style={{ width: `${pct}%`, background: s.color }} />
                </div>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 500,
                  background: bandBg(band), color: bandColor(band),
                }}>
                  {band.replace('_', ' ')}
                </span>
              </div>
            )
          })}

          {/* Overall */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: 4 }}>📊 Overall PLE</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#534AB7', marginBottom: 6 }}>
              {masteries.length ? Math.round(masteries.reduce((a, m) => a + m.avg_mastery_pct, 0) / masteries.length) : 0}%
            </div>
            <div className="prog-bar" style={{ marginBottom: 6 }}>
              <div className="prog-fill" style={{
                width: `${masteries.length ? Math.round(masteries.reduce((a, m) => a + m.avg_mastery_pct, 0) / masteries.length) : 0}%`,
                background: '#534AB7',
              }} />
            </div>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: '#EEEDFE', color: '#3C3489' }}>
              On track
            </span>
          </div>
        </div>

        {/* Weak areas */}
        {weakTopics.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Areas to focus on</div>
            <div style={{ background: '#FAEEDA', borderRadius: 12, padding: 14, marginBottom: 24 }}>
              {weakTopics.map((w, i) => (
                <div key={i} style={{ marginBottom: i < weakTopics.length - 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#633806' }}>{w.subtopic_name}</div>
                      <div style={{ fontSize: 11, color: '#854F0B' }}>{w.subject_name} · {w.topic_name}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#D85A30' }}>{Math.round(w.mastery_pct)}%</div>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${w.mastery_pct}%`, background: '#D85A30' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* No data yet */}
        {weakTopics.length === 0 && masteries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: '#888780' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: '#1a1a2e' }}>No practice yet</div>
            <div style={{ fontSize: 13 }}>Complete your first session to see progress here.</div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => router.push('/session?subject=mathematics')}>
              Start practising
            </button>
          </div>
        )}

        {/* Recent activity */}
        {sessions.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sessions.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < sessions.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {s.subjects?.icon_emoji || '📚'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.subjects?.name || 'Practice'}</div>
                    <div style={{ fontSize: 12, color: '#888780' }}>{formatDate(s.started_at)} · {s.total_questions} questions</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: (s.score_pct || 0) >= 60 ? '#1D9E75' : '#A32D2D' }}>
                    {s.score_pct ? Math.round(s.score_pct) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => router.push('/dashboard')}><span style={{ fontSize: 22 }}>🏠</span>Home</button>
        <button className="nav-btn" onClick={() => router.push('/session?subject=mathematics')}><span style={{ fontSize: 22 }}>✏️</span>Practice</button>
        <button className="nav-btn active" onClick={() => router.push('/progress')}><span style={{ fontSize: 22 }}>📊</span>Progress</button>
        <button className="nav-btn" onClick={() => router.push('/parent')}><span style={{ fontSize: 22 }}>👨‍👩‍👧</span>Parent</button>
      </nav>
    </div>
  )
}
