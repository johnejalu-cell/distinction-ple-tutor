'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
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

function RevisionContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [usedIds, setUsedIds] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [subtopicIds, setSubtopicIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [done, setDone] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [hasFullAccess, setHasFullAccess] = useState(true)
  const [startTime] = useState(Date.now())

  const correctCountRef = useRef(0)
  const totalAnsweredRef = useRef(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const subjectCode = searchParams.get('subject') || 'mathematics'
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check access — Revision Mode is premium only
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_subscribed, trial_started_at, subscription_expires_at')
      .eq('id', user.id)
      .single()

    let fullAccess = true
    if (profile) {
      const now = new Date()
      const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null
      const trialActive = trialStart ? (now.getTime() - trialStart.getTime()) < 24 * 60 * 60 * 1000 : false
      const subscriptionActive = profile.is_subscribed &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > now)
      fullAccess = trialActive || subscriptionActive
    }
    setHasFullAccess(fullAccess)

    if (!fullAccess) {
      router.push('/subscribe')
      return
    }

    const { data: students } = await supabase
      .from('students').select('id').eq('parent_id', user.id).limit(1)
    if (!students?.length) { router.push('/onboarding'); return }
    setStudentId(students[0].id)

    const { data: subject } = await supabase
      .from('subjects').select('id, name').eq('code', subjectCode).single()
    if (!subject) { router.push('/dashboard'); return }
    setSubjectName(subject.name)
    setSubjectId(subject.id)

    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, topics!inner(subject_id)')
      .eq('topics.subject_id', subject.id)

    if (!subtopics?.length) { router.push('/dashboard'); return }
    const allSubtopicIds = subtopics.map(s => s.id)
    setSubtopicIds(allSubtopicIds)

    // Load first batch
    const { data: qs } = await supabase
      .from('questions')
      .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
      .in('subtopic_id', allSubtopicIds)
      .eq('is_active', true)
      .limit(15)

    if (!qs?.length) { router.push('/dashboard'); return }

    const shuffled = qs.sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setUsedIds(shuffled.map(q => q.id))

    // Create a revision session
    const { data: session } = await supabase
      .from('sessions')
      .insert({ student_id: students[0].id, session_type: 'revision', subject_id: subject.id, total_questions: 0 })
      .select('id').single()

    if (session) setSessionId(session.id)
    setLoading(false)
  }

  async function loadMoreQuestions() {
    if (loadingMore || subtopicIds.length === 0) return
    setLoadingMore(true)

    const { data: qs } = await supabase
      .from('questions')
      .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
      .in('subtopic_id', subtopicIds)
      .eq('is_active', true)
      .not('id', 'in', `(${usedIds.join(',')})`)
      .limit(15)

    if (qs && qs.length > 0) {
      const shuffled = qs.sort(() => Math.random() - 0.5)
      setQuestions(prev => [...prev, ...shuffled])
      setUsedIds(prev => [...prev, ...shuffled.map(q => q.id)])
    } else {
      // Ran out of fresh questions — recycle from the start
      const { data: allQs } = await supabase
        .from('questions')
        .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
        .in('subtopic_id', subtopicIds)
        .eq('is_active', true)
        .limit(15)
      if (allQs) {
        const shuffled = allQs.sort(() => Math.random() - 0.5)
        setQuestions(prev => [...prev, ...shuffled])
      }
    }
    setLoadingMore(false)
  }

  async function submitAnswer() {
    if (!selected || answered) return
    setAnswered(true)
    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    totalAnsweredRef.current += 1
    if (isCorrect) correctCountRef.current += 1

    if (sessionId && studentId) {
      await supabase.from('session_responses').insert({
        session_id: sessionId, student_id: studentId, question_id: q.id,
        student_answer: selected, is_correct: isCorrect,
        hint_level_used: hintLevel, scaffold_opened: q.scaffold !== null,
        question_order: totalAnsweredRef.current,
      })
    }
  }

  async function nextQuestion() {
    // Load more questions when getting close to the end
    if (current + 3 >= questions.length) {
      loadMoreQuestions()
    }

    setCurrent(c => c + 1)
    setSelected(null)
    setAnswered(false)
    setShowHint(false)
    setHintLevel(0)
  }

  async function endSession() {
    if (sessionId) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000)
      await supabase.from('sessions').update({
        ended_at: new Date().toISOString(),
        correct_count: correctCountRef.current,
        wrong_count: totalAnsweredRef.current - correctCountRef.current,
        total_questions: totalAnsweredRef.current,
        points_earned: 0, // revision mode doesn't earn points
      }).eq('id', sessionId)
    }
    setDone(true)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📖</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Preparing revision questions...</div>
      </div>
    )
  }

  if (done) {
    const total = totalAnsweredRef.current
    const correct = correctCountRef.current
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const minutes = Math.round((Date.now() - startTime) / 60000)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', minHeight: '100vh', textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>📖</div>
        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Revision Complete!</div>
        <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 24 }}>
          Great work revising {subjectName}
        </div>

        <div style={{ background: '#EEEDFE', borderRadius: 12, padding: 20, width: '100%', marginBottom: 18 }}>
          <div style={{ fontSize: 44, fontWeight: 500, color: '#3C3489' }}>{pct}%</div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>Overall accuracy</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginBottom: 24 }}>
          {[
            { label: 'Questions', value: total, color: '#534AB7' },
            { label: 'Correct', value: correct, color: '#1D9E75' },
            { label: 'Minutes', value: minutes, color: '#BA7517' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#E1F5EE', borderRadius: 10, padding: 12, width: '100%', marginBottom: 20, fontSize: 13, color: '#0F6E56' }}>
          💡 Revision sessions update your mastery levels but don&apos;t count toward daily points or streaks — those come from your Daily Challenge.
        </div>

        <button className="btn-primary" onClick={() => { setCurrent(0); setDone(false); correctCountRef.current = 0; totalAnsweredRef.current = 0; init() }}>
          Revise again
        </button>
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => router.push('/dashboard')}>
          Back to home
        </button>
      </div>
    )
  }

  const q = questions[current]
  if (!q) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📖</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading more questions...</div>
      </div>
    )
  }
  const isCorrect = selected === q.correct_answer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="topbar">
        <button className="topbar-back" onClick={() => { if (confirm('End revision session?')) endSession() }}>✕</button>
        <div className="topbar-title">
          📖 {subjectName} Revision
        </div>
        <div style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
          Q{totalAnsweredRef.current + (answered ? 0 : 1)}
        </div>
      </div>

      {/* Running stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#F8F9FF', fontSize: 12, color: '#5F5E5A', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <span>✅ {correctCountRef.current} correct</span>
        <span>❌ {totalAnsweredRef.current - correctCountRef.current} wrong</span>
        <span>📊 {totalAnsweredRef.current > 0 ? Math.round((correctCountRef.current / totalAnsweredRef.current) * 100) : 0}% accuracy</span>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>

        {/* Subject tag */}
        <div style={{
          fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20,
          display: 'inline-block', marginBottom: 8,
          background: subjectCode === 'mathematics' ? '#FAEEDA' : subjectCode === 'english' ? '#E1F5EE' : '#EEEDFE',
          color: subjectCode === 'mathematics' ? '#854F0B' : subjectCode === 'english' ? '#0F6E56' : '#3C3489',
        }}>
          {subjectName}
        </div>
        <div style={{ fontSize: 12, color: '#888780', marginBottom: 14, textTransform: 'capitalize' }}>
          {q.question_type.replace('_', ' ')} · {q.difficulty}
        </div>

        {/* Scaffold */}
        {q.scaffold && (
          <div className="scaffold-box">
            <div style={{ fontSize: 12, fontWeight: 500, color: '#3C3489', marginBottom: 10 }}>💡 Step-by-step guide</div>
            {[
              { num: 1, label: 'What is the story about?', val: q.scaffold.story },
              { num: 2, label: 'Key numbers & keywords', val: q.scaffold.keywords },
              { num: 3, label: 'Which operation to use?', val: q.scaffold.operation },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: s.num < 3 ? 9 : 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#534AB7', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.num}</div>
                <div>
                  <div style={{ fontSize: 11, color: '#3C3489', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.4 }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question */}
        <div style={{ fontSize: 16, lineHeight: 1.65, marginBottom: 18, fontWeight: 500, color: '#1a1a2e' }}>{q.stem}</div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          {q.options?.map((opt) => {
            let cls = 'option-btn'
            if (answered) {
              if (opt.id === q.correct_answer) cls += ' correct'
              else if (opt.id === selected) cls += ' wrong'
            } else if (opt.id === selected) cls += ' selected'
            return (
              <button key={opt.id} className={cls} onClick={() => !answered && setSelected(opt.id)} disabled={answered}>
                {String.fromCharCode(65 + q.options.indexOf(opt))}. {opt.text}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className={`feedback-box ${isCorrect ? 'correct' : 'wrong'}`}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 5, color: isCorrect ? '#0F6E56' : '#A32D2D' }}>
              {isCorrect ? '✅ Correct!' : '❌ Not quite right.'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#5F5E5A' }}>{q.explanation}</div>
          </div>
        )}

        {/* Hint */}
        {showHint && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B', marginBottom: 6 }}>💡 Hint</div>
            <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.6 }}>
              {hintLevel === 1 ? q.hint_level_1 : q.hint_level_2}
            </div>
            {hintLevel === 1 && q.hint_level_2 && (
              <button onClick={() => setHintLevel(2)} style={{ marginTop: 8, fontSize: 12, color: '#854F0B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                Show more detail →
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!answered ? (
          <>
            <button className="btn-primary" disabled={!selected} onClick={submitAnswer}>Check Answer</button>
            {!showHint && (
              <button className="btn-secondary" style={{ marginTop: 9 }} onClick={() => { setShowHint(true); setHintLevel(1) }}>💡 Hint</button>
            )}
          </>
        ) : (
          <>
            <button className="btn-primary" style={{ background: '#1D9E75', marginBottom: 9 }} onClick={nextQuestion}>
              Next Question →
            </button>
            <button className="btn-secondary" onClick={endSession}>
              🏁 End revision session
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function RevisionPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📖</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading...</div>
      </div>
    }>
      <RevisionContent />
    </Suspense>
  )
}

