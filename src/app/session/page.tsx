'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

interface Question {
  id: string
  stem: string
  question_type: string
  difficulty: string
  options: { id: string; text: string }[]
  correct_answer: string
  explanation: string
  scaffold: { story: string; keywords: string; operation: string } | null
  hint_level_1: string
  hint_level_2: string
  subtopic_id: string
}

function SessionContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [done, setDone] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const subjectCode = searchParams.get('subject') || 'mathematics'
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Get student
    const { data: students } = await supabase
      .from('students').select('id').eq('parent_id', user.id).limit(1)
    if (!students?.length) { router.push('/onboarding'); return }
    const sid = students[0].id
    setStudentId(sid)

    // Get subject
    const { data: subject } = await supabase
      .from('subjects').select('id, name').eq('code', subjectCode).single()
    if (!subject) { router.push('/dashboard'); return }
    setSubjectName(subject.name)

    // Get questions for this subject
    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, topics!inner(subject_id)')
      .eq('topics.subject_id', subject.id)

    if (!subtopics?.length) { router.push('/dashboard'); return }
    const subtopicIds = subtopics.map(s => s.id)

    const { data: qs } = await supabase
      .from('questions')
      .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
      .in('subtopic_id', subtopicIds)
      .eq('is_active', true)
      .limit(20)

    if (!qs?.length) { router.push('/dashboard'); return }

    // Shuffle and take 5
    const shuffled = qs.sort(() => Math.random() - 0.5).slice(0, 5)
    setQuestions(shuffled)

    // Create session
    const { data: session } = await supabase
      .from('sessions')
      .insert({
        student_id: sid,
        session_type: 'topic_practice',
        subject_id: subject.id,
        total_questions: shuffled.length,
      })
      .select('id')
      .single()

    if (session) setSessionId(session.id)
    setLoading(false)
  }

  async function submitAnswer() {
    if (!selected || answered) return
    setAnswered(true)

    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    if (isCorrect) {
      setCorrect(c => c + 1)
      setPoints(p => p + 20)
    }

    // Save response
    if (sessionId && studentId) {
      await supabase.from('session_responses').insert({
        session_id: sessionId,
        student_id: studentId,
        question_id: q.id,
        student_answer: selected,
        is_correct: isCorrect,
        hint_level_used: hintLevel,
        scaffold_opened: q.scaffold !== null,
        question_order: current + 1,
      })
    }
  }

  async function nextQuestion() {
    if (current + 1 >= questions.length) {
      // Finalise session
      if (sessionId) {
        await supabase.from('sessions').update({
          ended_at: new Date().toISOString(),
          correct_count: correct + (selected === questions[current].correct_answer ? 1 : 0),
          wrong_count: questions.length - correct - (selected === questions[current].correct_answer ? 1 : 0),
          points_earned: points + (selected === questions[current].correct_answer ? 20 : 0),
          hints_used: hintLevel,
        }).eq('id', sessionId)

        // Update student points & streak
        if (studentId) {
          const today = new Date().toISOString().split('T')[0]
          const { data: s } = await supabase.from('students').select('total_points, current_streak_days, last_active_date').eq('id', studentId).single()
          if (s) {
            const lastActive = s.last_active_date
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yStr = yesterday.toISOString().split('T')[0]
            const newStreak = lastActive === yStr ? s.current_streak_days + 1 : lastActive === today ? s.current_streak_days : 1
            await supabase.from('students').update({
              total_points: s.total_points + points,
              current_streak_days: newStreak,
              last_active_date: today,
            }).eq('id', studentId)
          }
        }
      }
      setDone(true)
      return
    }

    setCurrent(c => c + 1)
    setSelected(null)
    setAnswered(false)
    setShowHint(false)
    setHintLevel(0)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📚</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading questions...</div>
      </div>
    )
  }

  // Results screen
  if (done) {
    const total = questions.length
    const pct = Math.round((correct / total) * 100)
    const medal = pct >= 80 ? '🏆' : pct >= 60 ? '🥈' : '🥉'
    const title = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practising!'
    const grade = pct >= 91 ? 'D1' : pct >= 81 ? 'D2' : pct >= 71 ? 'D3' : pct >= 61 ? 'D4' : pct >= 51 ? 'D5' : 'D6'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', minHeight: '100vh', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-in">{medal}</div>
        <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 24 }}>
          {pct >= 80 ? 'Distinction-level performance!' : 'You\'re improving every day.'}
        </div>

        <div style={{ background: '#EEEDFE', borderRadius: 12, padding: 20, width: '100%', marginBottom: 18 }}>
          <div style={{ fontSize: 52, fontWeight: 500, color: '#3C3489' }}>{pct}%</div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>Session score · Projected {grade}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginBottom: 24 }}>
          {[
            { label: 'Correct', value: correct, color: '#1D9E75' },
            { label: 'Wrong', value: total - correct, color: '#A32D2D' },
            { label: 'Points', value: `+${points}`, color: '#BA7517' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => { setCurrent(0); setSelected(null); setAnswered(false); setCorrect(0); setPoints(0); setDone(false); init() }}>
          Try again
        </button>
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => router.push('/dashboard')}>
          Back to home
        </button>
      </div>
    )
  }

  const q = questions[current]
  const isCorrect = selected === q.correct_answer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="topbar">
        <button className="topbar-back" onClick={() => { if (confirm('Exit session?')) router.push('/dashboard') }}>✕</button>
        <div className="topbar-title">{subjectName} · Q{current + 1}/{questions.length}</div>
        <div style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
          ⭐ {points}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 5, borderRadius: 3,
              background: i < current ? '#1D9E75' : i === current ? '#534AB7' : '#F1EFE8',
            }} />
          ))}
        </div>

        {/* Subject tag */}
        <div style={{
          fontSize: 11, fontWeight: 500, padding: '4px 10px',
          borderRadius: 20, display: 'inline-block', marginBottom: 8,
          background: subjectCode === 'mathematics' ? '#FAEEDA' : subjectCode === 'english' ? '#E1F5EE' : '#EEEDFE',
          color: subjectCode === 'mathematics' ? '#854F0B' : subjectCode === 'english' ? '#0F6E56' : '#3C3489',
        }}>
          {subjectName}
        </div>
        <div style={{ fontSize: 12, color: '#888780', marginBottom: 14, textTransform: 'capitalize' }}>
          {q.question_type.replace('_', ' ')} · {q.difficulty}
        </div>

        {/* Scaffold (word problems only) */}
        {q.scaffold && (
          <div className="scaffold-box">
            <div style={{ fontSize: 12, fontWeight: 500, color: '#3C3489', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              💡 Step-by-step guide
            </div>
            {[
              { num: 1, label: 'What is the story about?', val: q.scaffold.story },
              { num: 2, label: 'Key numbers & keywords', val: q.scaffold.keywords },
              { num: 3, label: 'Which operation to use?', val: q.scaffold.operation },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: s.num < 3 ? 9 : 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#534AB7', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.num}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#3C3489', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.4 }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question */}
        <div style={{ fontSize: 16, lineHeight: 1.65, marginBottom: 18, fontWeight: 500, color: '#1a1a2e' }}>
          {q.stem}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          {q.options?.map((opt) => {
            let cls = 'option-btn'
            if (answered) {
              if (opt.id === q.correct_answer) cls += ' correct'
              else if (opt.id === selected) cls += ' wrong'
            } else if (opt.id === selected) {
              cls += ' selected'
            }
            return (
              <button
                key={opt.id}
                className={cls}
                onClick={() => !answered && setSelected(opt.id)}
                disabled={answered}
              >
                {String.fromCharCode(65 + q.options.indexOf(opt))}. {opt.text}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className={`feedback-box ${isCorrect ? 'correct' : 'wrong'}`}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 5, color: isCorrect ? '#0F6E56' : '#A32D2D' }}>
              {isCorrect ? '✅ Correct! Well done!' : '❌ Not quite right.'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5F5E5A' }}>{q.explanation}</div>
          </div>
        )}

        {/* Hint panel */}
        {showHint && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B', marginBottom: 6 }}>💡 Hint</div>
            <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.6 }}>
              {hintLevel === 1 ? q.hint_level_1 : q.hint_level_2}
            </div>
            {hintLevel === 1 && q.hint_level_2 && (
              <button
                onClick={() => setHintLevel(2)}
                style={{ marginTop: 8, fontSize: 12, color: '#854F0B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Show more detail →
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!answered ? (
          <>
            <button
              className="btn-primary"
              disabled={!selected}
              onClick={submitAnswer}
            >
              Check Answer
            </button>
            {!showHint && (
              <button
                className="btn-secondary"
                style={{ marginTop: 9 }}
                onClick={() => { setShowHint(true); setHintLevel(1) }}
              >
                💡 Show hint
              </button>
            )}
          </>
        ) : (
          <button className="btn-primary" style={{ background: '#1D9E75' }} onClick={nextQuestion}>
            {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📚</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading...</div>
      </div>
    }>
      <SessionContent />
    </Suspense>
  )
}
