'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  full_name: string
  avatar_emoji: string
}

interface MockResult {
  id: string
  percentage: number
  projected_grade: string
  raw_score: number
  total_marks: number
  completed_at: string
  subject_breakdown: Record<string, number> | null
  sessions: { subjects: { name: string } | null } | null
}

const MOCK_TYPES = [
  {
    id: 'maths',
    title: 'Mathematics Mock',
    desc: 'Fractions, ratio, word problems, geometry',
    icon: '🔢',
    color: '#BA7517',
    bg: '#FAEEDA',
    questions: 20,
    minutes: 60,
    subject: 'mathematics',
  },
  {
    id: 'english',
    title: 'English Language Mock',
    desc: 'Grammar, vocabulary, comprehension',
    icon: '📖',
    color: '#1D9E75',
    bg: '#E1F5EE',
    questions: 20,
    minutes: 60,
    subject: 'english',
  },
  {
    id: 'science',
    title: 'Science Mock',
    desc: 'Living things, environment, matter, health',
    icon: '🔬',
    color: '#534AB7',
    bg: '#EEEDFE',
    questions: 20,
    minutes: 60,
    subject: 'science',
  },
  {
    id: 'mixed',
    title: 'Full PLE Mock',
    desc: 'All subjects combined — closest to the real exam',
    icon: '🎯',
    color: '#D85A30',
    bg: '#FAECE7',
    questions: 30,
    minutes: 90,
    subject: 'mixed',
  },
]

export default function MockPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [pastResults, setPastResults] = useState<MockResult[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: students } = await supabase
      .from('students').select('id, full_name, avatar_emoji')
      .eq('parent_id', user.id).limit(1)
    if (!students?.length) { router.push('/onboarding'); return }
    setStudent(students[0])

    const { data: results } = await supabase
      .from('mock_results')
      .select('id, percentage, projected_grade, raw_score, total_marks, completed_at, subject_breakdown, sessions(subjects(name))')
      .eq('student_id', students[0].id)
      .order('completed_at', { ascending: false })
      .limit(5)

    setPastResults((results as unknown as MockResult[]) || [])
    setLoading(false)
  }

  function startMock(type: typeof MOCK_TYPES[0]) {
    router.push(`/mock/exam?subject=${type.subject}&questions=${type.questions}&minutes=${type.minutes}&title=${encodeURIComponent(type.title)}`)
  }

  function gradeColor(grade: string) {
    if (['D1','D2'].includes(grade)) return '#1D9E75'
    if (['D3','D4'].includes(grade)) return '#BA7517'
    if (['D5','D6'].includes(grade)) return '#D85A30'
    return '#A32D2D'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🎓</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading mock exams...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="topbar">
        <button className="topbar-back" onClick={() => router.push('/dashboard')}>←</button>
        <div className="topbar-title">Mock Exams</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Intro */}
        <div style={{ background: '#EEEDFE', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#3C3489', marginBottom: 4 }}>
            🎓 Practice under exam conditions
          </div>
          <div style={{ fontSize: 13, color: '#534AB7', lineHeight: 1.6 }}>
            Mock exams are timed like the real PLE. Your results will show a projected grade (D1–D9). Try to complete without using hints for the most accurate grade prediction.
          </div>
        </div>

        {/* Mock type cards */}
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Choose a mock exam</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {MOCK_TYPES.map(t => (
            <div
              key={t.id}
              onClick={() => startMock(t)}
              style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {t.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#888780', marginBottom: 6 }}>{t.desc}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, background: t.bg, color: t.color, padding: '3px 8px', borderRadius: 20, fontWeight: 500 }}>
                    {t.questions} questions
                  </span>
                  <span style={{ fontSize: 11, background: '#F1EFE8', color: '#5F5E5A', padding: '3px 8px', borderRadius: 20, fontWeight: 500 }}>
                    ⏱ {t.minutes} mins
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 20, color: '#888780' }}>→</div>
            </div>
          ))}
        </div>

        {/* Past results */}
        {pastResults.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Past mock results</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pastResults.map((r, i) => (
                <div key={r.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 500, color: gradeColor(r.projected_grade), flexShrink: 0 }}>
                    {r.projected_grade}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {r.sessions?.subjects?.name || 'Mock Exam'}
                    </div>
                    <div style={{ fontSize: 12, color: '#888780' }}>
                      {r.raw_score}/{r.total_marks} marks · {Math.round(r.percentage || 0)}% · {new Date(r.completed_at).toLocaleDateString('en-UG')}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: gradeColor(r.projected_grade) }}>
                    {Math.round(r.percentage || 0)}%
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {pastResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#888780', fontSize: 13 }}>
            No mock exams completed yet. Start your first one above!
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => router.push('/dashboard')}><span style={{ fontSize: 22 }}>🏠</span>Home</button>
        <button className="nav-btn active"><span style={{ fontSize: 22 }}>✏️</span>Practice</button>
        <button className="nav-btn" onClick={() => router.push('/progress')}><span style={{ fontSize: 22 }}>📊</span>Progress</button>
        <button className="nav-btn" onClick={() => router.push('/parent')}><span style={{ fontSize: 22 }}>👨‍👩‍👧</span>Parent</button>
      </nav>
    </div>
  )
}
