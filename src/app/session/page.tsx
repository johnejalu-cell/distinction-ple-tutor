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

interface WeakSubtopic {
  subtopic_id: string
  mastery_pct: number
}

// Compress image to JPEG at reduced quality and size
async function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      const base64 = dataUrl.split(',')[1]
      resolve({ base64, type: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
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
  const correctRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [done, setDone] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [isAdaptive, setIsAdaptive] = useState(false)

  // AI Tutor state
  const [showTutor, setShowTutor] = useState(false)
  const [tutorQuestion, setTutorQuestion] = useState('')
  const [tutorResponse, setTutorResponse] = useState('')
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorError, setTutorError] = useState('')

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedImageType, setUploadedImageType] = useState<string>('image/jpeg')
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null)
  const [imageProcessing, setImageProcessing] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const subjectCode = searchParams.get('subject') || 'mathematics'
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

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
    const allSubtopicIds = subtopics.map(s => s.id)

    // ── ADAPTIVE SELECTION ──────────────────────────────────────
    const { data: weakProgress } = await supabase
      .from('student_progress')
      .select('subtopic_id, mastery_pct')
      .eq('student_id', sid)
      .in('subtopic_id', allSubtopicIds)
      .lt('mastery_pct', 65)
      .order('mastery_pct', { ascending: true })
      .limit(5)

    let selectedQuestions: Question[] = []

    if (weakProgress && weakProgress.length > 0) {
      setIsAdaptive(true)
      const weakIds = weakProgress.map((w: WeakSubtopic) => w.subtopic_id)

      const { data: mediumProgress } = await supabase
        .from('student_progress')
        .select('subtopic_id, mastery_pct')
        .eq('student_id', sid)
        .in('subtopic_id', allSubtopicIds)
        .gte('mastery_pct', 65)
        .lt('mastery_pct', 85)
        .order('last_practiced_at', { ascending: true })
        .limit(3)

      const mediumIds = (mediumProgress || []).map((m: WeakSubtopic) => m.subtopic_id)
      const knownIds = [...weakIds, ...mediumIds]
      const strongIds = allSubtopicIds.filter(id => !knownIds.includes(id))

      const [weakRes, mediumRes, strongRes] = await Promise.all([
        supabase.from('questions')
          .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
          .in('subtopic_id', weakIds).eq('is_active', true).limit(10),
        mediumIds.length > 0
          ? supabase.from('questions')
              .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
              .in('subtopic_id', mediumIds).eq('is_active', true).limit(6)
          : Promise.resolve({ data: [] }),
        strongIds.length > 0
          ? supabase.from('questions')
              .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
              .in('subtopic_id', strongIds).eq('is_active', true).limit(6)
          : Promise.resolve({ data: [] }),
      ])

      const weakQs   = (weakRes.data   || []).sort(() => Math.random() - 0.5).slice(0, 3)
      const mediumQs = (mediumRes.data || []).sort(() => Math.random() - 0.5).slice(0, 1)
      const strongQs = (strongRes.data || []).sort(() => Math.random() - 0.5).slice(0, 1)
      const combined = [...weakQs, ...mediumQs, ...strongQs]
      if (combined.length >= 3) {
        selectedQuestions = combined.sort(() => Math.random() - 0.5)
      }
    }

    if (selectedQuestions.length < 3) {
      setIsAdaptive(false)
      const { data: allQs } = await supabase
        .from('questions')
        .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
        .in('subtopic_id', allSubtopicIds).eq('is_active', true).limit(20)
      if (!allQs?.length) { router.push('/dashboard'); return }
      selectedQuestions = allQs.sort(() => Math.random() - 0.5).slice(0, 5)
    }

    selectedQuestions = selectedQuestions.slice(0, 5)
    setQuestions(selectedQuestions)

    const { data: session } = await supabase
      .from('sessions')
      .insert({ student_id: sid, session_type: 'topic_practice', subject_id: subject.id, total_questions: selectedQuestions.length })
      .select('id').single()

    if (session) setSessionId(session.id)
    setLoading(false)
  }

  async function submitAnswer() {
    if (!selected || answered) return
    setAnswered(true)
    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    if (isCorrect) { correctRef.current += 1; setCorrect(correctRef.current); setPoints(p => p + 20) }
    if (sessionId && studentId) {
      await supabase.from('session_responses').insert({
        session_id: sessionId, student_id: studentId, question_id: q.id,
        student_answer: selected, is_correct: isCorrect,
        hint_level_used: hintLevel, scaffold_opened: q.scaffold !== null,
        question_order: current + 1,
      })
    }
  }

  async function nextQuestion() {
    if (current + 1 >= questions.length) {
      const lastCorrect = selected === questions[current].correct_answer
      const finalCorrect = correctRef.current
      if (sessionId) {
        await supabase.from('sessions').update({
          ended_at: new Date().toISOString(),
          correct_count: finalCorrect,
          wrong_count: questions.length - finalCorrect,
          points_earned: correctRef.current * 20,
          hints_used: hintLevel,
        }).eq('id', sessionId)
      }
      if (studentId) {
        const today = new Date().toISOString().split('T')[0]
        const { data: s } = await supabase.from('students')
          .select('total_points, current_streak_days, last_active_date')
          .eq('id', studentId).single()
        if (s) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yStr = yesterday.toISOString().split('T')[0]
          const newStreak = s.last_active_date === yStr
            ? s.current_streak_days + 1
            : s.last_active_date === today ? s.current_streak_days : 1
          await supabase.from('students').update({
            total_points: s.total_points + (correctRef.current * 20),
            current_streak_days: newStreak,
            last_active_date: today,
          }).eq('id', studentId)
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
    setShowTutor(false)
    setTutorResponse('')
    setTutorQuestion('')
    setTutorError('')
    clearImage()
  }

  // ── IMAGE HANDLING ──────────────────────────────────────────
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageProcessing(true)
    try {
      const { base64, type } = await compressImage(file, 800, 0.6)
      setUploadedImage(base64)
      setUploadedImageType(type)
      setUploadedImagePreview(`data:${type};base64,${base64}`)
    } catch {
      alert('Could not process image. Please try a different photo.')
    } finally {
      setImageProcessing(false)
      // Reset input so same file can be re-selected
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearImage() {
    setUploadedImage(null)
    setUploadedImagePreview(null)
    setUploadedImageType('image/jpeg')
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function askTutor() {
    if (!tutorQuestion.trim()) return
    setTutorLoading(true)
    setTutorError('')
    setTutorResponse('')

    try {
      const q = questions[current]
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.stem,
          studentQuestion: tutorQuestion,
          subject: subjectName,
          difficulty: q.difficulty,
          imageBase64: uploadedImage || undefined,
          imageType: uploadedImageType,
        }),
      })
      const data = await res.json()
      if (data.error) setTutorError(data.error)
      else setTutorResponse(data.explanation)
    } catch {
      setTutorError('Could not reach the tutor. Please check your connection and try again.')
    } finally {
      setTutorLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📚</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Preparing your questions...</div>
      </div>
    )
  }

  if (done) {
    const total = questions.length
    const pct = Math.round((correctRef.current / total) * 100)
    const medal = pct >= 80 ? '🏆' : pct >= 60 ? '🥈' : '🥉'
    const title = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practising!'
    const grade = pct >= 91 ? 'D1' : pct >= 81 ? 'D2' : pct >= 71 ? 'D3' : pct >= 61 ? 'D4' : pct >= 51 ? 'D5' : 'D6'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', minHeight: '100vh', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>{medal}</div>
        <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#5F5E5A', marginBottom: 24 }}>
          {pct >= 80 ? 'Distinction-level performance!' : 'You\'re improving every day.'}
        </div>
        {isAdaptive && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: 12, padding: 12, width: '100%', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500 }}>🎯 Adaptive session — focused on your weak areas</div>
          </div>
        )}
        <div style={{ background: '#EEEDFE', borderRadius: 12, padding: 20, width: '100%', marginBottom: 18 }}>
          <div style={{ fontSize: 52, fontWeight: 500, color: '#3C3489' }}>{pct}%</div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>Session score · Projected {grade}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginBottom: 24 }}>
          {[
            { label: 'Correct', value: correctRef.current, color: '#1D9E75' },
            { label: 'Wrong', value: total - correctRef.current, color: '#A32D2D' },
            { label: 'Points', value: `+${points}`, color: '#BA7517' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={() => { setCurrent(0); setSelected(null); setAnswered(false); setCorrect(0); correctRef.current = 0; setPoints(0); setDone(false); setShowTutor(false); setTutorResponse(''); init() }}>
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
        <div className="topbar-title">
          {subjectName} · Q{current + 1}/{questions.length}
          {isAdaptive && <span style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', padding: '2px 7px', borderRadius: 10, marginLeft: 8, fontWeight: 500 }}>🎯 Adaptive</span>}
        </div>
        <div style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>
          ⭐ {points}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
          {questions.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < current ? '#1D9E75' : i === current ? '#534AB7' : '#F1EFE8' }} />
          ))}
        </div>

        {/* Adaptive notice */}
        {isAdaptive && current === 0 && (
          <div style={{ background: '#E1F5EE', border: '0.5px solid rgba(29,158,117,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#0F6E56' }}>
            🎯 <strong>Adaptive mode:</strong> These questions target your weak areas to help you improve faster.
          </div>
        )}

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
              <button onClick={() => setHintLevel(2)} style={{ marginTop: 8, fontSize: 12, color: '#854F0B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                Show more detail →
              </button>
            )}
          </div>
        )}

        {/* ── AI TUTOR PANEL ── */}
        {showTutor && (
          <div style={{ background: '#EEEDFE', border: '0.5px solid rgba(83,74,183,0.25)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#3C3489' }}>AI Tutor</div>
                <div style={{ fontSize: 11, color: '#888780' }}>Ask me anything — or upload your working</div>
              </div>
            </div>

            {/* Quick suggestions */}
            {!tutorResponse && !tutorLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {[
                  'Can you explain this question to me?',
                  'How do I solve this step by step?',
                  'Please check my working in the image',
                ].map(suggestion => (
                  <button key={suggestion} onClick={() => setTutorQuestion(suggestion)}
                    style={{
                      background: tutorQuestion === suggestion ? '#534AB7' : '#fff',
                      color: tutorQuestion === suggestion ? '#fff' : '#534AB7',
                      border: '1px solid rgba(83,74,183,0.3)', borderRadius: 8,
                      padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            <textarea
              value={tutorQuestion}
              onChange={e => setTutorQuestion(e.target.value)}
              placeholder="Type your question here..."
              rows={2}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid rgba(83,74,183,0.3)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#fff', color: '#1a1a2e', marginBottom: 10 }}
            />

            {/* Image upload buttons */}
            {/* Hidden inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
            <input ref={fileInputRef}   type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />

            {!uploadedImagePreview ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={imageProcessing}
                  style={{
                    flex: 1, padding: '10px 8px',
                    border: '1.5px dashed rgba(83,74,183,0.4)',
                    borderRadius: 10, background: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer', fontSize: 12, color: '#534AB7',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📷</span> Take photo
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageProcessing}
                  style={{
                    flex: 1, padding: '10px 8px',
                    border: '1.5px dashed rgba(83,74,183,0.4)',
                    borderRadius: 10, background: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer', fontSize: 12, color: '#534AB7',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📁</span> Upload file
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <img
                  src={uploadedImagePreview}
                  alt="Your uploaded working"
                  style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover', border: '1.5px solid rgba(83,74,183,0.3)' }}
                />
                <button
                  onClick={clearImage}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                    borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
                <div style={{ fontSize: 11, color: '#534AB7', marginTop: 6, textAlign: 'center' }}>
                  ✅ Image ready — tutor will analyse your working
                </div>
              </div>
            )}

            {imageProcessing && (
              <div style={{ fontSize: 12, color: '#534AB7', textAlign: 'center', marginBottom: 8 }}>
                ⏳ Processing image...
              </div>
            )}

            {/* Ask button */}
            <button
              onClick={askTutor}
              disabled={tutorLoading || !tutorQuestion.trim() || imageProcessing}
              style={{
                background: tutorLoading || !tutorQuestion.trim() ? '#9b93d4' : '#534AB7',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 16px', fontSize: 14, fontWeight: 500,
                cursor: tutorLoading || !tutorQuestion.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', width: '100%', marginBottom: 10,
              }}
            >
              {tutorLoading ? '🤔 Thinking...' : uploadedImage ? '✨ Ask Tutor (with image)' : '✨ Ask the Tutor'}
            </button>

            {/* Tutor response */}
            {tutorResponse && (
              <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '0.5px solid rgba(83,74,183,0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#534AB7', marginBottom: 8 }}>🤖 Tutor says:</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: '#1a1a2e', whiteSpace: 'pre-wrap' }}>{tutorResponse}</div>
                <button
                  onClick={() => { setTutorResponse(''); setTutorQuestion(''); clearImage() }}
                  style={{ marginTop: 10, fontSize: 12, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  Ask another question
                </button>
              </div>
            )}

            {tutorError && (
              <div style={{ background: '#FCEBEB', borderRadius: 10, padding: 12, fontSize: 13, color: '#A32D2D' }}>
                {tutorError}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!answered ? (
          <>
            <button className="btn-primary" disabled={!selected} onClick={submitAnswer}>
              Check Answer
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
              {!showHint && (
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowHint(true); setHintLevel(1) }}>
                  💡 Hint
                </button>
              )}
              <button
                className="btn-secondary"
                style={{ flex: 1, borderColor: showTutor ? '#534AB7' : undefined, color: showTutor ? '#534AB7' : undefined }}
                onClick={() => setShowTutor(t => !t)}
              >
                🤖 Ask Tutor
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="btn-primary" style={{ background: '#1D9E75', marginBottom: 9 }} onClick={nextQuestion}>
              {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </button>
            {!showTutor && (
              <button className="btn-secondary" onClick={() => setShowTutor(true)}>
                🤖 Ask Tutor to explain this
              </button>
            )}
          </>
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
