'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
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
  subtopic_id: string
  subject_code?: string
}

interface Answer {
  questionId: string
  selected: string | null
  correct: boolean
}

function ExamContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [examTitle, setExamTitle] = useState('')
  const [timeWarning, setTimeWarning] = useState(false)
  const [started, setStarted] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const subjectCode = searchParams.get('subject') || 'mathematics'
  const totalQuestions = parseInt(searchParams.get('questions') || '20')
  const totalMinutes = parseInt(searchParams.get('minutes') || '60')
  const title = searchParams.get('title') || 'Mock Exam'
  const supabase = createClient()

  useEffect(() => {
    setExamTitle(decodeURIComponent(title))
    setTimeLeft(totalMinutes * 60)
    loadQuestions()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!started || done) return
    if (timeLeft <= 0) { submitExam(); return }

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 300 && !timeWarning) setTimeWarning(true) // 5 min warning
        if (t <= 1) { submitExam(); return 0 }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, done, timeLeft])

  async function loadQuestions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: students } = await supabase
      .from('students').select('id').eq('parent_id', user.id).limit(1)
    if (!students?.length) { router.push('/onboarding'); return }
    setStudentId(students[0].id)

    let allQs: Question[] = []

    if (subjectCode === 'mixed') {
      // Get questions from all 3 subjects equally
      const { data: subjects } = await supabase
        .from('subjects').select('id, code')
      
      if (subjects) {
        const perSubject = Math.floor(totalQuestions / 3)
        for (const sub of subjects) {
          const { data: subtopics } = await supabase
            .from('subtopics')
            .select('id, topics!inner(subject_id)')
            .eq('topics.subject_id', sub.id)
          
          if (subtopics?.length) {
            const { data: qs } = await supabase
              .from('questions')
              .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, subtopic_id')
              .in('subtopic_id', subtopics.map(s => s.id))
              .eq('is_active', true)
              .limit(perSubject + 5)
            
            const tagged = (qs || []).map(q => ({ ...q, subject_code: sub.code }))
            allQs = [...allQs, ...tagged]
          }
        }
      }
    } else {
      // Single subject
      const { data: subject } = await supabase
        .from('subjects').select('id').eq('code', subjectCode).single()
      
      if (subject) {
        setSubjectId(subject.id)
        const { data: subtopics } = await supabase
          .from('subtopics')
          .select('id, topics!inner(subject_id)')
          .eq('topics.subject_id', subject.id)

        if (subtopics?.length) {
          const { data: qs } = await supabase
            .from('questions')
            .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, subtopic_id')
            .in('subtopic_id', subtopics.map(s => s.id))
            .eq('is_active', true)
            .limit(50)
          
          allQs = (qs || []).map(q => ({ ...q, subject_code: subjectCode }))
        }
      }
    }

    if (!allQs.length) { router.push('/mock'); return }

    // Shuffle and take required number
    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, totalQuestions)
    setQuestions(shuffled)

    // Create session
    const { data: session } = await supabase
      .from('sessions')
      .insert({
        student_id: students[0].id,
        session_type: 'mock_exam',
        subject_id: subjectId,
        total_questions: shuffled.length,
      })
      .select('id').single()

    if (session) setSessionId(session.id)
    setLoading(false)
  }

  function selectAnswer(optId: string) {
    if (done) return
    setSelected(optId)
  }

  function nextQuestion() {
    if (!selected && current < questions.length - 1) {
      // Allow skipping — record as unanswered
      const q = questions[current]
      setAnswers(prev => [...prev, { questionId: q.id, selected: null, correct: false }])
      setCurrent(c => c + 1)
      setSelected(null)
      return
    }

    if (selected) {
      const q = questions[current]
      const isCorrect = selected === q.correct_answer
      setAnswers(prev => [...prev, { questionId: q.id, selected, correct: isCorrect }])
    }

    if (current + 1 >= questions.length) {
      submitExam()
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
    }
  }

  const submitExam = useCallback(async () => {
    if (done) return
    setDone(true)
  }, [done])

  // Save results after done
  useEffect(() => {
    if (done && answers.length > 0 && studentId && sessionId) {
      saveResults()
    }
  }, [done])

  async function saveResults() {
    const correctCount = answers.filter(a => a.correct).length
    const total = questions.length
    const pct = Math.round((correctCount / total) * 100)
    const timeTaken = totalMinutes * 60 - timeLeft

    // Save session responses
    const responseInserts = answers.map((a, i) => ({
      session_id: sessionId!,
      student_id: studentId!,
      question_id: a.questionId,
      student_answer: a.selected || 'skipped',
      is_correct: a.correct,
      hint_level_used: 0,
      scaffold_opened: false,
      question_order: i + 1,
    }))

    await supabase.from('session_responses').insert(responseInserts)

    // Update session
    await supabase.from('sessions').update({
      ended_at: new Date().toISOString(),
      correct_count: correctCount,
      wrong_count: total - correctCount,
      points_earned: correctCount * 10,
    }).eq('id', sessionId!)

    // Subject breakdown for mixed exam
    let breakdown: Record<string, number> | null = null
    if (subjectCode === 'mixed') {
      breakdown = {}
      const codes = ['mathematics', 'english', 'science']
      for (const code of codes) {
        const subQs = questions.filter(q => q.subject_code === code)
        const subAnswers = answers.filter(a => subQs.some(q => q.id === a.questionId))
        const subCorrect = subAnswers.filter(a => a.correct).length
        if (subQs.length > 0) {
          breakdown[code] = Math.round((subCorrect / subQs.length) * 100)
        }
      }
    }

    // Save mock result
    await supabase.from('mock_results').insert({
      session_id: sessionId!,
      student_id: studentId!,
      mock_id: null,
      raw_score: correctCount,
      total_marks: total,
      subject_breakdown: breakdown,
      time_taken_seconds: timeTaken,
    })

    // Update student points
    const { data: s } = await supabase
      .from('students').select('total_points').eq('id', studentId!).single()
    if (s) {
      await supabase.from('students').update({
        total_points: s.total_points + (correctCount * 10)
      }).eq('id', studentId!)
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function projectedGrade(pct: number) {
    if (pct >= 91) return 'D1'
    if (pct >= 81) return 'D2'
    if (pct >= 71) return 'D3'
    if (pct >= 61) return 'D4'
    if (pct >= 51) return 'D5'
    if (pct >= 41) return 'D6'
    if (pct >= 31) return 'D7'
    if (pct >= 21) return 'D8'
    if (pct > 0)   return 'D9'
    return 'U'
  }

  function gradeColor(grade: string) {
    if (['D1','D2'].includes(grade)) return { bg: '#E1F5EE', color: '#0F6E56' }
    if (['D3','D4'].includes(grade)) return { bg: '#FAEEDA', color: '#854F0B' }
    if (['D5','D6'].includes(grade)) return { bg: '#FAECE7', color: '#993C1D' }
    return { bg: '#FCEBEB', color: '#A32D2D' }
  }

  // ── LOADING ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📝</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Preparing your exam...</div>
      </div>
    )
  }

  // ── START SCREEN ─────────────────────────────────────────────
  if (!started) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="topbar">
          <button className="topbar-back" onClick={() => router.push('/mock')}>←</button>
          <div className="topbar-title">{examTitle}</div>
        </div>
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>📝</div>
          <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>{examTitle}</div>
          <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 24, lineHeight: 1.6 }}>
            You will have <strong>{totalMinutes} minutes</strong> to answer <strong>{questions.length} questions</strong>. The timer starts when you tap Begin.
          </div>

          <div style={{ background: '#F1EFE8', borderRadius: 12, padding: 16, width: '100%', marginBottom: 24 }}>
            {[
              { label: 'Questions', value: questions.length },
              { label: 'Time allowed', value: `${totalMinutes} minutes` },
              { label: 'Marks each', value: '1 mark' },
              { label: 'Total marks', value: questions.length },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                <span style={{ fontSize: 13, color: '#5F5E5A' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#FAEEDA', borderRadius: 10, padding: 12, width: '100%', marginBottom: 24, fontSize: 13, color: '#854F0B', lineHeight: 1.6 }}>
            💡 <strong>Tip:</strong> Read each question carefully. You can skip questions and come back — but in this version, unanswered questions count as wrong. Attempt every question!
          </div>

          <button className="btn-primary" onClick={() => setStarted(true)} style={{ fontSize: 16 }}>
            Begin Exam →
          </button>
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => router.push('/mock')}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── RESULTS SCREEN ───────────────────────────────────────────
  if (done) {
    const correctCount = answers.filter(a => a.correct).length
    const total = questions.length
    const pct = Math.round((correctCount / total) * 100)
    const grade = projectedGrade(pct)
    const { bg, color } = gradeColor(grade)
    const timeTaken = totalMinutes * 60 - timeLeft

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="topbar">
          <div className="topbar-title">Exam Results</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* Grade card */}
          <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color, marginBottom: 8, fontWeight: 500 }}>Projected PLE Grade</div>
            <div style={{ fontSize: 72, fontWeight: 500, color, lineHeight: 1, marginBottom: 8 }}>{grade}</div>
            <div style={{ fontSize: 32, fontWeight: 500, color, marginBottom: 4 }}>{pct}%</div>
            <div style={{ fontSize: 13, color, opacity: 0.8 }}>
              {correctCount} out of {total} correct
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { label: 'Correct', value: correctCount, color: '#1D9E75' },
              { label: 'Wrong', value: total - correctCount, color: '#A32D2D' },
              { label: 'Time used', value: `${Math.floor(timeTaken/60)}m`, color: '#534AB7' },
            ].map(s => (
              <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Grade scale */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>PLE Grade Scale</div>
            {[
              { grade: 'D1', range: '91-100%', color: '#1D9E75' },
              { grade: 'D2', range: '81-90%', color: '#1D9E75' },
              { grade: 'D3', range: '71-80%', color: '#BA7517' },
              { grade: 'D4', range: '61-70%', color: '#BA7517' },
              { grade: 'D5', range: '51-60%', color: '#D85A30' },
              { grade: 'D6', range: '41-50%', color: '#D85A30' },
              { grade: 'D7-D9', range: 'Below 40%', color: '#A32D2D' },
            ].map(g => (
              <div key={g.grade} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', borderRadius: 6, marginBottom: 3,
                background: grade === g.grade || (grade >= 'D7' && g.grade === 'D7-D9') ? `${g.color}18` : 'transparent',
                border: grade === g.grade || (grade >= 'D7' && g.grade === 'D7-D9') ? `1px solid ${g.color}40` : '1px solid transparent',
              }}>
                <span style={{ fontSize: 13, fontWeight: grade === g.grade ? 600 : 400, color: g.color }}>{g.grade}</span>
                <span style={{ fontSize: 12, color: '#888780' }}>{g.range}</span>
                {(grade === g.grade || (grade >= 'D7' && g.grade === 'D7-D9')) && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: g.color }}>← You</span>
                )}
              </div>
            ))}
          </div>

          {/* Question review */}
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Question Review</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {questions.map((q, i) => {
              const ans = answers[i]
              const isCorrect = ans?.correct
              const skipped = !ans?.selected || ans.selected === 'skipped'
              return (
                <div key={q.id} style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 500,
                  background: skipped ? '#F1EFE8' : isCorrect ? '#E1F5EE' : '#FCEBEB',
                  color: skipped ? '#888780' : isCorrect ? '#0F6E56' : '#A32D2D',
                  border: `1px solid ${skipped ? '#ddd' : isCorrect ? '#1D9E75' : '#A32D2D'}30`,
                }}>
                  {i + 1}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#888780', marginBottom: 24 }}>
            <span>🟢 Correct ({answers.filter(a => a.correct).length})</span>
            <span>🔴 Wrong ({answers.filter(a => !a.correct && a.selected && a.selected !== 'skipped').length})</span>
            <span>⬜ Skipped ({answers.filter(a => !a.selected || a.selected === 'skipped').length})</span>
          </div>

          <button className="btn-primary" onClick={() => router.push('/mock')}>
            Try another mock
          </button>
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => router.push('/dashboard')}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  // ── EXAM SCREEN ──────────────────────────────────────────────
  const q = questions[current]
  const answeredCount = answers.length
  const isLastQuestion = current === questions.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Timer bar */}
      <div style={{
        background: timeWarning ? '#A32D2D' : '#534AB7',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.5s',
      }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
          Q{current + 1}/{questions.length}
        </div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          ⏱ {formatTime(timeLeft)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
          {answeredCount} answered
        </div>
      </div>

      {/* Time warning */}
      {timeWarning && (
        <div style={{ background: '#FCEBEB', padding: '8px 16px', fontSize: 13, color: '#A32D2D', fontWeight: 500, textAlign: 'center' }}>
          ⚠️ Less than 5 minutes remaining — attempt all questions!
        </div>
      )}

      {/* Progress bar */}
      <div style={{ height: 3, background: '#F1EFE8' }}>
        <div style={{ height: '100%', background: '#534AB7', width: `${((current + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {/* Question number dots — compact */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 16, flexWrap: 'wrap' }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < answers.length
                ? (answers[i]?.correct ? '#1D9E75' : '#A32D2D')
                : i === current ? '#534AB7' : '#F1EFE8',
            }} />
          ))}
        </div>

        {/* Subject tag */}
        <div style={{
          fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
          display: 'inline-block', marginBottom: 10,
          background: q.subject_code === 'mathematics' ? '#FAEEDA' : q.subject_code === 'english' ? '#E1F5EE' : '#EEEDFE',
          color: q.subject_code === 'mathematics' ? '#854F0B' : q.subject_code === 'english' ? '#0F6E56' : '#3C3489',
        }}>
          {q.subject_code === 'mathematics' ? '🔢 Mathematics' : q.subject_code === 'english' ? '📖 English' : '🔬 Science'}
        </div>

        {/* Question stem */}
        <div style={{ fontSize: 15, lineHeight: 1.65, marginBottom: 16, fontWeight: 500, color: '#1a1a2e' }}>
          {q.stem}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
          {q.options?.map((opt) => (
            <button
              key={opt.id}
              className={`option-btn${selected === opt.id ? ' selected' : ''}`}
              onClick={() => selectAnswer(opt.id)}
            >
              {String.fromCharCode(65 + q.options.indexOf(opt))}. {opt.text}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <button
          className="btn-primary"
          onClick={nextQuestion}
          style={{ marginBottom: 10 }}
        >
          {isLastQuestion ? 'Submit Exam' : selected ? 'Next Question →' : 'Skip Question →'}
        </button>

        {isLastQuestion && !selected && (
          <div style={{ fontSize: 12, color: '#888780', textAlign: 'center' }}>
            You have unanswered questions. Submit anyway or go back to answer them.
          </div>
        )}
      </div>
    </div>
  )
}

export default function MockExamPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📝</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading exam...</div>
      </div>
    }>
      <ExamContent />
    </Suspense>
  )
}
