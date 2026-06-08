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
  const [activeTab, setActiveTab] = useState<'overview'|'weak'|'history'>('overview')
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
    setStudentName(student.full_name.split(' ')[0])
    setTotalPoints(student.total_points)
    setStreak(student.current_streak_days)

    const [masteryRes, weakRes, sessRes] = await Promise.all([
      supabase.from('v_subject_mastery').select('*').eq('student_id', student.id),
      supabase.from('v_weak_subtopics').select('*').eq('student_id', student.id).limit(10),
      supabase.from('sessions')
        .select('id, session_type, started_at, score_pct, total_questions, correct_count, subjects(name, icon_emoji)')
        .eq('student_id', student.id)
        .order('started_at', { ascending: false })
        .limit(8),
    ])

    setMasteries(masteryRes.data || [])
    setWeakTopics(weakRes.data || [])
    setSessions((sessRes.data as unknown as RecentSession[]) || [])
    setLoading(false)
  }

  function subjectColor(code: string) {
    return code === 'mathematics' ? '#BA7517' : code === 'english' ? '#1D9E75' : '#534AB7'
  }

  function subjectForWeak(name: string) {
    if (name.toLowerCase().includes('math')) return 'mathematics'
    if (name.toLowerCase().includes('english')) return 'english'
    return 'science'
  }

  function bandColor(band: string) {
    const map: Record<string, string> = { distinction: '#1D9E75', mastered: '#1D9E75', developing: '#BA7517', learning: '#D85A30', not_started: '#888780' }
    return map[band] || '#888780'
  }

  function bandBg(band: string) {
    const map: Record<string, string> = { distinction: '#E1F5EE', mastered: '#E1F5EE', developing: '#FAEEDA', learning: '#FAECE7', not_started: '#F1EFE8' }
    return map[band] || '#F1EFE8'
  }

  function formatDate(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff} days ago`
  }

  const subjects = [
    { code: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#BA7517' },
    { code: 'english',     name: 'English',     icon: '📖', color: '#1D9E75' },
    { code: 'science',     name: 'Science',     icon: '🔬', color: '#534AB7' },
  ]

  const overallPct = masteries.length
    ? Math.round(masteries.reduce((a, m) => a + m.avg_mastery_pct, 0) / masteries.length)
    : 0

  const criticalTopics = weakTopics.filter(w => w.mastery_pct < 40)
  const needsWorkTopics = weakTopics.filter(w => w.mastery_pct >= 40 && w.mastery_pct < 65)

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
        <div className="topbar-title">{studentName}&apos;s Progress</div>
        <div style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
          ⭐ {totalPoints}
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '12px 16px 8px' }}>
        {[
          { label: 'Points', value: totalPoints, color: '#BA7517' },
          { label: 'Streak', value: `${streak}d 🔥`, color: '#D85A30' },
          { label: 'Overall', value: `${overallPct}%`, color: overallPct >= 70 ? '#1D9E75' : overallPct >= 50 ? '#BA7517' : '#A32D2D' },
        ].map(s => (
          <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weak area alert banner — shown prominently if critical topics exist */}
      {criticalTopics.length > 0 && (
        <div style={{ margin: '0 16px 8px', background: '#FCEBEB', border: '0.5px solid rgba(163,45,45,0.3)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#A32D2D', marginBottom: 6 }}>
            🚨 Urgent: {criticalTopics.length} topic{criticalTopics.length > 1 ? 's' : ''} need immediate attention
          </div>
          <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 10, lineHeight: 1.5 }}>
            {criticalTopics.slice(0, 2).map((t, i) => (
              <div key={i}>• {t.subtopic_name} ({t.subject_name}) — {Math.round(t.mastery_pct)}%</div>
            ))}
            {criticalTopics.length > 2 && <div>• and {criticalTopics.length - 2} more...</div>}
          </div>
          <button
            onClick={() => router.push(`/session?subject=${subjectForWeak(criticalTopics[0].subject_name)}`)}
            style={{ background: '#A32D2D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
          >
            🎯 Practice weak areas now
          </button>
        </div>
      )}

      {/* Needs work banner */}
      {criticalTopics.length === 0 && needsWorkTopics.length > 0 && (
        <div style={{ margin: '0 16px 8px', background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#854F0B', marginBottom: 6 }}>
            ⚠️ {needsWorkTopics.length} topic{needsWorkTopics.length > 1 ? 's' : ''} need more practice
          </div>
          <div style={{ fontSize: 13, color: '#854F0B', marginBottom: 10, lineHeight: 1.5 }}>
            {needsWorkTopics.slice(0, 2).map((t, i) => (
              <div key={i}>• {t.subtopic_name} ({t.subject_name}) — {Math.round(t.mastery_pct)}%</div>
            ))}
          </div>
          <button
            onClick={() => router.push(`/session?subject=${subjectForWeak(needsWorkTopics[0].subject_name)}`)}
            style={{ background: '#BA7517', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
          >
            🎯 Practice weak areas now
          </button>
        </div>
      )}

      {/* All clear banner */}
      {weakTopics.length === 0 && masteries.length > 0 && (
        <div style={{ margin: '0 16px 8px', background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#0F6E56' }}>
            🏆 No weak areas detected — keep it up!
          </div>
          <div style={{ fontSize: 13, color: '#1D9E75', marginTop: 4 }}>
            Keep practising to maintain your mastery levels.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '8px 16px 0', gap: 6 }}>
        {(['overview', 'weak', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              background: activeTab === tab ? '#534AB7' : '#F1EFE8',
              color: activeTab === tab ? '#fff' : '#888780',
            }}>
            {tab === 'overview' ? '📊 Overview' : tab === 'weak' ? '🎯 Weak Areas' : '📋 History'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Subject Performance</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {subjects.map(s => {
                const m = masteries.find(x => x.subject_code === s.code)
                const pct = m ? Math.round(m.avg_mastery_pct) : 0
                const band = m?.mastery_band || 'not_started'
                return (
                  <div key={s.code} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 14, cursor: 'pointer' }}
                    onClick={() => router.push(`/session?subject=${s.code}`)}>
                    <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: 4 }}>{s.icon} {s.name}</div>
                    <div style={{ fontSize: 24, fontWeight: 500, color: s.color, marginBottom: 6 }}>{pct}%</div>
                    <div className="prog-bar" style={{ marginBottom: 6 }}>
                      <div className="prog-fill" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: bandBg(band), color: bandColor(band) }}>
                      {band.replace('_', ' ')}
                    </span>
                  </div>
                )
              })}

              {/* Overall */}
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: 4 }}>📊 Overall PLE</div>
                <div style={{ fontSize: 24, fontWeight: 500, color: '#534AB7', marginBottom: 6 }}>{overallPct}%</div>
                <div className="prog-bar" style={{ marginBottom: 6 }}>
                  <div className="prog-fill" style={{ width: `${overallPct}%`, background: '#534AB7' }} />
                </div>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: '#EEEDFE', color: '#3C3489' }}>
                  {overallPct >= 80 ? 'Distinction track' : overallPct >= 60 ? 'On track' : 'Needs work'}
                </span>
              </div>
            </div>

            {/* PLE Grade projection */}
            <div style={{ background: '#534AB7', borderRadius: 12, padding: 16, marginBottom: 16, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Projected PLE Grade</div>
              <div style={{ fontSize: 44, fontWeight: 500, marginBottom: 4 }}>
                {overallPct >= 91 ? 'D1' : overallPct >= 81 ? 'D2' : overallPct >= 71 ? 'D3' : overallPct >= 61 ? 'D4' : overallPct >= 51 ? 'D5' : overallPct > 0 ? 'D6' : '—'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {overallPct >= 81 ? 'Distinction! Keep pushing 🏆' : overallPct >= 61 ? 'Good — keep practising' : overallPct > 0 ? 'More practice needed' : 'Complete sessions to see your grade'}
              </div>
            </div>

            {sessions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#888780' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e', marginBottom: 4 }}>No sessions yet</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Start practising to see your progress here.</div>
                <button className="btn-primary" onClick={() => router.push('/session?subject=mathematics')}>
                  Start first session
                </button>
              </div>
            )}
          </>
        )}

        {/* WEAK AREAS TAB */}
        {activeTab === 'weak' && (
          <>
            {weakTopics.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#888780' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e', marginBottom: 6 }}>No weak areas!</div>
                <div style={{ fontSize: 13 }}>
                  {masteries.length === 0
                    ? 'Complete some sessions first to identify weak areas.'
                    : 'All your subtopics are above 65% mastery. Keep it up!'}
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 14, lineHeight: 1.5 }}>
                  The app is tracking <strong>{weakTopics.length} subtopic{weakTopics.length > 1 ? 's' : ''}</strong> where you need more practice. Tap a subject to start an adaptive session targeting these areas.
                </div>

                {/* Group by subject */}
                {subjects.map(s => {
                  const sTopics = weakTopics.filter(w => w.subject_name.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
                  if (sTopics.length === 0) return null
                  return (
                    <div key={s.code} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.icon} {s.name}</div>
                        <button
                          onClick={() => router.push(`/session?subject=${s.code}`)}
                          style={{ background: s.color, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Practice →
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sTopics.map((t, i) => (
                          <div key={i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 10, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t.subtopic_name}</div>
                                <div style={{ fontSize: 11, color: '#888780' }}>{t.topic_name} · {t.total_attempts} attempt{t.total_attempts !== 1 ? 's' : ''}</div>
                              </div>
                              <span style={{
                                fontSize: 12, fontWeight: 500, padding: '3px 8px', borderRadius: 20, marginLeft: 8, flexShrink: 0,
                                background: t.mastery_pct < 40 ? '#FCEBEB' : '#FAEEDA',
                                color: t.mastery_pct < 40 ? '#A32D2D' : '#854F0B',
                              }}>
                                {Math.round(t.mastery_pct)}%
                              </span>
                            </div>
                            <div className="prog-bar">
                              <div className="prog-fill" style={{
                                width: `${t.mastery_pct}%`,
                                background: t.mastery_pct < 40 ? '#A32D2D' : '#BA7517'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#888780' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14 }}>No sessions yet. Start practising!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sessions.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < sessions.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {(s.subjects as { icon_emoji?: string } | null)?.icon_emoji || '📚'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {(s.subjects as { name?: string } | null)?.name || 'Practice session'}
                      </div>
                      <div style={{ fontSize: 12, color: '#888780' }}>
                        {formatDate(s.started_at)} · {s.total_questions} questions
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: (s.score_pct || 0) >= 80 ? '#1D9E75' : (s.score_pct || 0) >= 60 ? '#BA7517' : '#A32D2D' }}>
                        {s.score_pct ? Math.round(s.score_pct) : 0}%
                      </div>
                      <div style={{ fontSize: 11, color: '#888780' }}>
                        {s.correct_count}/{s.total_questions} correct
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => router.push('/dashboard')}><span style={{ fontSize: 20 }}>🏠</span>Home</button>
        <button className="nav-btn" onClick={() => router.push('/session?subject=mathematics')}><span style={{ fontSize: 20 }}>✏️</span>Practice</button>
        <button className="nav-btn" onClick={() => router.push('/tutor')}><span style={{ fontSize: 20 }}>🤖</span>Tutor</button>
        <button className="nav-btn" onClick={() => router.push('/mock')}><span style={{ fontSize: 20 }}>📝</span>Mock</button>
        <button className="nav-btn active"><span style={{ fontSize: 20 }}>📊</span>Progress</button>
      </nav>
    </div>
  )
}
