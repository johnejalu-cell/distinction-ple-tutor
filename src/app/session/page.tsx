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

// ── PLE MARK-WEIGHTING ──────────────────────────────────────────
// Approximate relative weight (out of 100) each topic carries on the
// actual PLE paper, based on typical UNEB emphasis. These are estimates,
// not official UNEB-published figures — adjust the numbers below if you
// have actual past-paper mark tallies. Topics not listed fall back to
// an even default weight. Names must match `topics.name` exactly.
const TOPIC_WEIGHTS: Record<string, Record<string, number>> = {
  mathematics: {
    'Word Problems': 23,
    'Fractions & Decimals': 16,
    'Percentages': 14,
    'Money & Financial Maths': 14,
    'Angles & Lines': 12,
    'Ratio & Proportion': 11,
    'Geometry — Area/Perimeter': 9,
    'LCM, HCF & Factors': 5,
  },
  english: {
    'Reading Comprehension': 30,
    'Tenses': 20,
    'Parts of Speech': 20,
    'Vocabulary': 18,
    'Punctuation & Spelling': 12,
  },
  science: {
    'Human Body Systems': 20,
    'Living Things': 18,
    'Health & Nutrition': 17,
    'Environment & Ecology': 15,
    'Food Chains & Webs': 15,
    'States of Matter': 15,
  },
}
const DEFAULT_TOPIC_WEIGHT = 10

// Fisher-Yates shuffle — unbiased, unlike Array.sort(() => Math.random() - 0.5)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Compress image before sending
async function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas error')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], type: 'image/jpeg' })
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
  const [loading, setLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [done, setDone] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [hasFullAccess, setHasFullAccess] = useState(true)
  const [questionLimit, setQuestionLimit] = useState(5)

  // Ref-based correct count for accurate scoring
  const correctRef = useRef(0)

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

    // Check access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_subscribed, trial_started_at, subscription_expires_at')
      .eq('id', user.id)
      .single()

    let fullAccess = true
    let limit = 5

    if (profile) {
      const now = new Date()
      const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null
      const trialActive = trialStart ? (now.getTime() - trialStart.getTime()) < 24 * 60 * 60 * 1000 : false
      const subscriptionActive = profile.is_subscribed &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > now)
      fullAccess = trialActive || subscriptionActive
      limit = fullAccess ? 5 : 3
    }

    setHasFullAccess(fullAccess)
    setQuestionLimit(limit)

    const { data: students } = await supabase
      .from('students').select('id').eq('parent_id', user.id).limit(1)
    if (!students?.length) { router.push('/onboarding'); return }
    const sid = students[0].id
    setStudentId(sid)

    const { data: subject } = await supabase
      .from('subjects').select('id, name').eq('code', subjectCode).single()
    if (!subject) { router.push('/dashboard'); return }
    setSubjectName(subject.name)

    // Fetch subtopics WITH their topic name, so we can weight selection
    // by real PLE mark distribution instead of treating every subtopic equally.
    const { data: subtopicRows } = await supabase
      .from('subtopics')
      .select('id, topics!inner(name, subject_id)')
      .eq('topics.subject_id', subject.id)

    if (!subtopicRows?.length) { router.push('/dashboard'); return }

    type SubtopicRow = {
      id: string
      topics: { name: string; subject_id: string } | { name: string; subject_id: string }[]
    }
    const topicToSubtopics: Record<string, string[]> = {}
    for (const row of subtopicRows as SubtopicRow[]) {
      const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics
      const topicName = topic?.name || 'Unknown'
      if (!topicToSubtopics[topicName]) topicToSubtopics[topicName] = []
      topicToSubtopics[topicName].push(row.id)
    }
    const allSubtopicIds = subtopicRows.map(s => s.id)

    const weights = TOPIC_WEIGHTS[subjectCode] || {}
    const topicWeightList = Object.keys(topicToSubtopics).map(name => ({
      name,
      weight: weights[name] ?? DEFAULT_TOPIC_WEIGHT,
    }))

    // Recently-answered question IDs for this student, so we avoid
    // repeating the same questions session after session. We prefer
    // unseen questions but fall back to recently-seen ones if a pool
    // is too small to fill a session without repeats.
    const { data: recentResponses } = await supabase
      .from('session_responses')
      .select('question_id')
      .eq('student_id', sid)
      .order('created_at', { ascending: false })
      .limit(60)
    const recentlySeenIds = new Set((recentResponses || []).map(r => r.question_id))

    // Fetch the FULL active question pool for this subject — no low
    // artificial limit. Fetching 20 rows with no ORDER BY was the bug
    // causing the same fixed set of questions to appear repeatedly:
    // Postgres returns unordered results in a consistent sequence, so
    // every session was drawing from the same ~20 rows and just
    // reshuffling their order client-side.
    const { data: allSubjectQs } = await supabase
      .from('questions')
      .select('id, stem, question_type, difficulty, options, correct_answer, explanation, scaffold, hint_level_1, hint_level_2, subtopic_id')
      .in('subtopic_id', allSubtopicIds)
      .eq('is_active', true)
      .limit(1000)

    const questionPool = (allSubjectQs || []) as Question[]
    if (!questionPool.length) { router.push('/dashboard'); return }

    // Prefer unseen questions from a pool; only include recently-seen
    // ones if there aren't enough fresh ones to fill `count`.
    function pickFresh(pool: Question[], count: number): Question[] {
      const fresh = shuffle(pool.filter(q => !recentlySeenIds.has(q.id)))
      const stale = shuffle(pool.filter(q => recentlySeenIds.has(q.id)))
      return [...fresh, ...stale].slice(0, count)
    }

    // Weighted stratified sampling: pick a topic according to its PLE
    // weight, then a random subtopic within it, then a random unused
    // question within that — preferring unseen questions throughout.
    // Repeated across a session, this makes the overall mix of topics
    // track real exam mark distribution instead of uniform-per-subtopic.
    function pickWeighted(pool: Question[], count: number): Question[] {
      const bySubtopic: Record<string, Question[]> = {}
      for (const q of pool) {
        (bySubtopic[q.subtopic_id] ||= []).push(q)
      }
      const usedIds = new Set<string>()
      const fresh: Question[] = []
      const stale: Question[] = []
      const totalW = topicWeightList.reduce((s, t) => s + t.weight, 0) || 1
      let guard = 0
      while (fresh.length + stale.length < count && guard < count * 60) {
        guard++
        let r = Math.random() * totalW
        let chosenTopic = topicWeightList[0]?.name
        for (const t of topicWeightList) {
          r -= t.weight
          if (r <= 0) { chosenTopic = t.name; break }
        }
        const subIds = (topicToSubtopics[chosenTopic] || [])
          .filter(id => (bySubtopic[id] || []).some(q => !usedIds.has(q.id)))
        if (!subIds.length) {
          // This topic is exhausted for this session — if every topic is
          // exhausted, stop; otherwise just try again with another pick.
          const anyLeft = topicWeightList.some(t =>
            (topicToSubtopics[t.name] || []).some(id => (bySubtopic[id] || []).some(q => !usedIds.has(q.id)))
          )
          if (!anyLeft) break
          continue
        }
        const subId = subIds[Math.floor(Math.random() * subIds.length)]
        const candidates = (bySubtopic[subId] || []).filter(q => !usedIds.has(q.id))
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        usedIds.add(pick.id)
        if (recentlySeenIds.has(pick.id)) stale.push(pick); else fresh.push(pick)
      }
      return shuffle([...fresh, ...stale]).slice(0, count)
    }

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

      const weakPool = questionPool.filter(q => weakIds.includes(q.subtopic_id))
      const mediumPool = questionPool.filter(q => mediumIds.includes(q.subtopic_id))
      const strongPool = questionPool.filter(q => strongIds.includes(q.subtopic_id))

      const weakQs = pickFresh(weakPool, 3)
      const mediumQs = pickFresh(mediumPool, 1)
      const strongQs = pickFresh(strongPool, 1)
      const combined = [...weakQs, ...mediumQs, ...strongQs]
      if (combined.length >= 3) selectedQuestions = shuffle(combined)
    }

    if (selectedQuestions.length < 3) {
      setIsAdaptive(false)
      selectedQuestions = pickWeighted(questionPool, Math.max(limit, 5))
      if (!selectedQuestions.length) { router.push('/dashboard'); return }
    }

    // Apply question limit (3 for free, 5 for full access)
    selectedQuestions = selectedQuestions.slice(0, limit)
    setQuestions(selectedQuestions)

    const { data: session } = await supabase
      .from('sessions')
      .insert({ student_id: sid, session_type: 'topic_practice', subject_id: subject.id, total_questions: selectedQuestions.length })
      .select('id').single()

    if (session) setSessionId(session.id)
    setLoading(false)
    correctRef.current = 0
  }

  async function submitAnswer() {
    if (!selected || answered) return
    setAnswered(true)
    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    if (isCorrect) { correctRef.current += 1; setPoints(p => p + 20) }
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
      const finalCorrect = correctRef.current
      if (sessionId) {
        await supabase.from('sessions').update({
          ended_at: new Date().toISOString(),
          correct_count: finalCorrect,
          wrong_count: questions.length - finalCorrect,
          points_earned: finalCorrect * 20,
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
            total_points: s.total_points + (finalCorrect * 20),
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

  // Image handling
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
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearImage() {
    setUploadedImage(null)
    setUploadedImagePreview(null)
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
          question: q.stem, studentQuestion: tutorQuestion,
          subject: subjectName, difficulty: q.difficulty,
          imageBase64: uploadedImage || undefined, imageType: uploadedImageType,
        }),
      })
      const data = await res.json()
      if (data.requiresSubscription) {
        router.push('/subscribe')
        return
      }
      if (data.error) setTutorError(data.error)
      else setTutorResponse(data.explanation)
    } catch {
      setTutorError('Could not reach the tutor. Please check your connection.')
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

        {/* Upgrade prompt for limited users */}
        {!hasFullAccess && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: 12, padding: 14, width: '100%', marginBottom: 16, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B', marginBottom: 4 }}>
              ⚠️ Limited to {questionLimit} questions per day
            </div>
            <div style={{ fontSize: 13, color: '#854F0B', marginBottom: 10 }}>
              Upgrade to get 5 questions per session, AI Tutor, Mock Exams and full Progress tracking.
            </div>
            <button onClick={() => router.push('/subscribe')}
              style={{ background: '#BA7517', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Subscribe — UGX 25,000/month →
            </button>
          </div>
        )}

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
            { label: 'Points', value: `+${correctRef.current * 20}`, color: '#BA7517' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => {
          setCurrent(0); setSelected(null); setAnswered(false)
          correctRef.current = 0; setPoints(0); setDone(false)
          setShowTutor(false); setTutorResponse(''); init()
        }}>
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
          {!hasFullAccess && <span style={{ fontSize: 11, background: '#FAEEDA', color: '#854F0B', padding: '2px 7px', borderRadius: 10, marginLeft: 8, fontWeight: 500 }}>Limited</span>}
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

        {/* Limited access notice */}
        {!hasFullAccess && current === 0 && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid rgba(186,117,23,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#854F0B' }}>
            ⚠️ <strong>Limited access:</strong> {questionLimit} questions per day.{' '}
            <span onClick={() => router.push('/subscribe')} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Upgrade for unlimited access</span>
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
              {isCorrect ? '✅ Correct! Well done!' : '❌ Not quite right.'}
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

        {/* AI Tutor panel */}
        {showTutor && (
          <div style={{ background: '#EEEDFE', border: '0.5px solid rgba(83,74,183,0.25)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#3C3489' }}>AI Tutor</div>
                <div style={{ fontSize: 11, color: '#888780' }}>Ask me anything — or upload your working</div>
              </div>
            </div>

            {!hasFullAccess ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#854F0B', marginBottom: 6 }}>AI Tutor is a Premium feature</div>
                <div style={{ fontSize: 13, color: '#888780', marginBottom: 14 }}>Subscribe to ask the AI tutor any question and upload photos of your working.</div>
                <button onClick={() => router.push('/subscribe')}
                  style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Subscribe — UGX 25,000/month
                </button>
              </div>
            ) : (
              <>
                {!tutorResponse && !tutorLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {['Can you explain this question to me?', 'How do I solve this step by step?', 'Please check my working in the image'].map(s => (
                      <button key={s} onClick={() => setTutorQuestion(s)}
                        style={{ background: tutorQuestion === s ? '#534AB7' : '#fff', color: tutorQuestion === s ? '#fff' : '#534AB7', border: '1px solid rgba(83,74,183,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <textarea value={tutorQuestion} onChange={e => setTutorQuestion(e.target.value)}
                  placeholder="Type your question here..." rows={2}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid rgba(83,74,183,0.3)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#fff', marginBottom: 10 }} />

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />

                {!uploadedImagePreview ? (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button onClick={() => cameraInputRef.current?.click()} disabled={imageProcessing}
                      style={{ flex: 1, padding: '10px 8px', border: '1.5px dashed rgba(83,74,183,0.4)', borderRadius: 10, background: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, color: '#534AB7', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>📷</span> Take photo
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={imageProcessing}
                      style={{ flex: 1, padding: '10px 8px', border: '1.5px dashed rgba(83,74,183,0.4)', borderRadius: 10, background: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, color: '#534AB7', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>📁</span> Upload file
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <img src={uploadedImagePreview} alt="Uploaded" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover', border: '1.5px solid rgba(83,74,183,0.3)' }} />
                    <button onClick={clearImage} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>✕</button>
                    <div style={{ fontSize: 11, color: '#534AB7', marginTop: 6, textAlign: 'center' }}>✅ Image ready</div>
                  </div>
                )}

                {imageProcessing && <div style={{ fontSize: 12, color: '#534AB7', textAlign: 'center', marginBottom: 8 }}>⏳ Processing...</div>}

                <button onClick={askTutor} disabled={tutorLoading || !tutorQuestion.trim() || imageProcessing}
                  style={{ background: tutorLoading || !tutorQuestion.trim() ? '#9b93d4' : '#534AB7', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: tutorLoading || !tutorQuestion.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', width: '100%', marginBottom: 10 }}>
                  {tutorLoading ? '🤔 Thinking...' : uploadedImage ? '✨ Ask Tutor (with image)' : '✨ Ask the Tutor'}
                </button>

                {tutorResponse && (
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '0.5px solid rgba(83,74,183,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#534AB7', marginBottom: 8 }}>🤖 Tutor says:</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: '#1a1a2e', whiteSpace: 'pre-wrap' }}>{tutorResponse}</div>
                    <button onClick={() => { setTutorResponse(''); setTutorQuestion(''); clearImage() }}
                      style={{ marginTop: 10, fontSize: 12, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                      Ask another question
                    </button>
                  </div>
                )}

                {tutorError && (
                  <div style={{ background: '#FCEBEB', borderRadius: 10, padding: 12, fontSize: 13, color: '#A32D2D' }}>{tutorError}</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!answered ? (
          <>
            <button className="btn-primary" disabled={!selected} onClick={submitAnswer}>Check Answer</button>
            <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
              {!showHint && (
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowHint(true); setHintLevel(1) }}>💡 Hint</button>
              )}
              <button className="btn-secondary"
                style={{ flex: 1, borderColor: showTutor ? '#534AB7' : undefined, color: showTutor ? '#534AB7' : undefined }}
                onClick={() => setShowTutor(t => !t)}>
                🤖 Ask Tutor
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="btn-primary" style={{ background: '#1D9E75', marginBottom: 9 }} onClick={nextQuestion}>
              {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </button>
            {!showTutor && hasFullAccess && (
              <button className="btn-secondary" onClick={() => setShowTutor(true)}>🤖 Ask Tutor to explain this</button>
            )}
            {!hasFullAccess && (
              <button className="btn-secondary" onClick={() => router.push('/subscribe')}>🔒 Unlock AI Tutor — Upgrade</button>
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
