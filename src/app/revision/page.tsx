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
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [subtopicIds, setSubtopicIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [done, setDone] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [startTime] = useState(Date.now())
  const [allExhausted, setAllExhausted] = useState(false)

  // Track all question IDs seen this session
  const seenThisSession = useRef<Set<string>>(new Set())
  // Track recently answered from DB (last 7 days)
  const recentlyAnswered = useRef<Set<string>>(new Set())
  // All available question IDs for this subject
  const allSubjectQIds = useRef<string[]>([])

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

    // Check access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_subscribed, trial_started_at, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (profile) {
      const now = new Date()
      const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null
      const trialActive = trialStart ? (now.getTime() - trialStart.getTime()) < 24 * 60 * 60 * 1000 : false
      const subscriptionActive = profile.is_subscribed &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > now)
      if (!trialActive && !subscriptionActive) {
        router.push('/subscribe')
        return
      }
    }

    const { data: students } = await supabase
      .from('students').select('id').eq('parent_id', user.id).limit(1)
    if (!students?.length) { router.push('/onboarding'); return }
    const sid = students[0].id
    setStudentId(sid)

    const { data: subject } = await supabase
      .from('subjects').select('id, name').eq('code', subjectCode).single()
    if (!subject) { router.push('/dashboard'); return }
    setSubjectName(subject.name)

    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, topics!inner(subject_id)')
      .eq('topics.subject_id', subject.id)

    if (!subtopics?.length) { router.push('/dashboard'); return }
    const allSubIds = subtopics.map(s => s.id)
    setSubtopicIds(allSubIds)

    // Get ALL question IDs for this subject so we know total pool size
    const { data: allQIds } = await supabase
      .from('questions')
      .select('id')
      .in('subtopic_id', allSubIds)
      .eq('is_active', true)
    allSubjectQIds.current = (allQIds || []).map(q => q.id)

    // Get questions answered in last 7 days for this student
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentResponses } = await supabase
      .from('session_responses')
      .select('question_id')
      .eq('student_id', sid)
      .gte('answered_at', sevenDaysAgo.toISOString())

    const recentIds = new Set((recentResponses || []).map(r => r.question_id))
    recentlyAnswered.current = recentIds

    // Create session
    const { data: session } = await supabase
      .from('sessions')
      .insert({ student_id: sid, session_type: 'revision', subject_id: subject.id, total_questions: 0 })
      .select('id').single()
    if (session) setSessionId(session.id)

    // Load first batch — prioritise unseen questions
    await loadBatch(allSubIds, recentIds, new Set())
    setLoading(false)
  }

  async function loadBatch(
    subIds: string[],
    recentIds: Set<string>,
    seenIds: Set<string>
  ) {
    const excludeIds = new Set([...Array.from(recentIds), ...Array.from(seenIds)])
    const freshIds = allSubjectQIds.current.filter(id => !excludeIds.has(id))

    if (freshIds.length > 0) {
      // Load fresh (never seen recently) questions first
      const { data: qs } = await supabase
        .from('questions')
        .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
        .in('id', freshIds)
        .eq('is_active', true)
        .limit(15)

      if (qs && qs.length > 0) {
        const shuffled = qs.sort(() => Math.random() - 0.5)
        setQuestions(prev => [...prev, ...shuffled])
        shuffled.forEach(q => seenThisSession.current.add(q.id))
        return
      }
    }

    // No fresh questions — load recently seen ones (excluding only this session)
    const recycleIds = allSubjectQIds.current.filter(id => !seenIds.has(id))

    if (recycleIds.length > 0) {
      const { data: qs } = await supabase
        .from('questions')
        .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
        .in('id', recycleIds)
        .eq('is_active', true)
        .limit(15)

      if (qs && qs.length > 0) {
        const shuffled = qs.sort(() => Math.random() - 0.5)
        setQuestions(prev => [...prev, ...shuffled])
        shuffled.forEach(q => seenThisSession.current.add(q.id))
        setAllExhausted(true) // signal that we're now recycling
        return
      }
    }

    // Absolute fallback — reset and reload everything
    seenThisSession.current.clear()
    const { data: qs } = await supabase
      .from('questions')
      .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
      .in('subtopic_id', subIds)
      .eq('is_active', true)
      .limit(15)
    if (qs) {
      const shuffled = qs.sort(() => Math.random() - 0.5)
      setQuestions(prev => [...prev, ...shuffled])
      shuffled.forEach(q => seenThisSession.current.add(q.id))
    }
  }

  async function submitAnswer() {
    if (!selected || answered) return
    setAnswered(true)
    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    totalAnsweredRef.current += 1
    if (isCorrect) correctCountRef.current += 1

    // Mark as recently answered so future sessions deprioritise it
    recentlyAnswered.current.add(q.id)

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
    // Load more when 3 from the end
    if (current + 3 >= questions.length && !loadingMore) {
      setLoadingMore(true)
      await loadBatch(subtopicIds, recentlyAnswered.current, seenThisSession.current)
      setLoadingMore(false)
    }

    setCurrent(c => c + 1)
    setSelected(null)
    setAnswered(false)
    setShowHint(false)
    setHintLevel(0)
  }

  async function endSession() {
    if (sessionId) {
      await supabase.from('sessions').update({
        ended_at: new Date().toISOString(),
        correct_count: correctCountRef.current,
        wrong_count: totalAnsweredRef.current - correctCountRef.current,
        total_questions: totalAnsweredRef.current,
        points_earned: 0,
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
        <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 24 }}>Great work revising {subjectName}</div>

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

        <div style={{ background: '#E1F5EE', borderRadius: 10, padding: 12, width: '100%', marginBottom: 20, fontSize: 13, color: '#0F6E56', textAlign: 'left' }}>
          💡 Questions you answered today will be deprioritised in your next revision session — new questions come first.
        </div>

        <button className="btn-primary" onClick={() => router.push('/revision/select')}>
          Revise another subject
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
        <div className="topbar-title">📖 {subjectName} Revision</div>
        <div style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
          Q{totalAnsweredRef.current + 1}
        </div>
      </div>

      {/* Running stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#F8F9FF', fontSize: 12, color: '#5F5E5A', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <span>✅ {correctCountRef.current} correct</span>
        <span>❌ {totalAnsweredRef.current - correctCountRef.current} wrong</span>
        <span>📊 {totalAnsweredRef.current > 0 ? Math.round((correctCountRef.current / totalAnsweredRef.current) * 100) : 0}% accuracy</span>
      </div>

      {/* Recycling notice */}
      {allExhausted && (
        <div style={{ background: '#FAEEDA', padding: '8px 16px', fontSize: 12, color: '#854F0B', textAlign: 'center' }}>
          🔄 You&apos;ve seen all fresh questions — cycling through earlier ones
        </div>
      )}

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
              {loadingMore ? 'Loading...' : 'Next Question →'}
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
